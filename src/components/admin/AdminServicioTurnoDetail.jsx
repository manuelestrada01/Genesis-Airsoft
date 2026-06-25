import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp, runTransaction, deleteField } from "firebase/firestore";
import { db } from "../../firebase/config";
import AuthContext from "../../context/AuthContext";
import AdminSidebar from "./AdminSidebar";
import { generatePresupuestoPDF } from "../../utils/generatePresupuestoPDF";
import "./admin.css";

const STATUS_COLORS = {
  pending_approval: "#d97706",
  approved: "#7cb800",
  in_progress: "#ea580c",
  presupuesto_enviado: "#60a5fa",
  presupuesto_aprobado: "#7cb800",
  parts_payment_review: "#ea580c",
  presupuesto_rechazado: "#dc2626",
  completed: "#16a34a",
  cancelled: "#6b7280",
  rejected: "#dc2626",
};

const STATUS_LABELS = {
  pending_approval: "Pendiente de aprobación",
  approved: "Aprobado",
  in_progress: "En proceso",
  presupuesto_enviado: "Presupuesto enviado al cliente",
  presupuesto_aprobado: "Presupuesto aprobado — esperando pago repuestos",
  parts_payment_review: "Pago de repuestos en revisión",
  presupuesto_rechazado: "Presupuesto rechazado por cliente",
  completed: "Completado",
  cancelled: "Cancelado",
  rejected: "Rechazado",
};

const DEFAULT_ITEM = { descripcion: "", tipo: "Mano de obra", cantidad: 1, precioUnitario: 0, subtotal: 0 };

export default function AdminServicioTurnoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [turno, setTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Rejection
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Replica edit state
  const [replicaEdit, setReplicaEdit] = useState(null); // null = view mode
  const [savingReplica, setSavingReplica] = useState(false);

  const handleSaveReplica = async () => {
    if (!replicaEdit) return;
    setSavingReplica(true);
    try {
      await updateDoc(doc(db, "servicioTurnos", id), {
        replica: { ...turno.replica, ...replicaEdit },
        updatedAt: serverTimestamp(),
      });
      setTurno((prev) => ({ ...prev, replica: { ...prev.replica, ...replicaEdit } }));
      setReplicaEdit(null);
      setMessage("Réplica actualizada ✔");
    } catch (err) {
      setMessage("Error al guardar réplica: " + err.message);
    } finally {
      setSavingReplica(false);
    }
  };

  // Planilla editor state
  const [showPlanilla, setShowPlanilla] = useState(false);
  const [planillaData, setPlanillaData] = useState({
    tecnico: "Manuel Estrada",
    observaciones: "",
    formaDePago: "",
    items: [{ ...DEFAULT_ITEM }],
    descuentoPercent: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "servicioTurnos", id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setTurno(data);
          if (data.planilla) {
            setPlanillaData({
              tecnico: data.planilla.tecnico || "Manuel Estrada",
              observaciones: data.planilla.observaciones || "",
              formaDePago: data.planilla.formaDePago || "",
              items: data.planilla.items?.length > 0 ? data.planilla.items : [{ ...DEFAULT_ITEM }],
              descuentoPercent: data.planilla.descuentoPercent || 0,
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Status actions ──
  const updateStatus = async (newStatus, extra = {}) => {
    setSaving(true);
    setMessage("");
    try {
      await updateDoc(doc(db, "servicioTurnos", id), {
        status: newStatus,
        ...extra,
        updatedAt: serverTimestamp(),
        ...(newStatus === "approved" ? { approvedAt: serverTimestamp() } : {}),
      });
      setTurno((prev) => ({ ...prev, status: newStatus, ...extra }));
      setMessage(`Estado actualizado: ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      setMessage("Error al actualizar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = () => updateStatus("approved");
  const handleMarkInProgress = () => updateStatus("in_progress");

  const handleReject = async () => {
    if (!rejectReason.trim()) { setMessage("Ingresá un motivo de rechazo"); return; }
    await updateStatus("rejected", { rejectionReason: rejectReason });
    setShowRejectInput(false);
  };

  // ── Comprobante ──
  const handleConfirmPayment = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateDoc(doc(db, "servicioTurnos", id), {
        status: "in_progress",
        paymentConfirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTurno((prev) => ({ ...prev, status: "in_progress" }));
      setMessage("Pago confirmado. Turno en proceso.");
    } catch (err) {
      setMessage("Error al confirmar pago: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRejectComprobante = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateDoc(doc(db, "servicioTurnos", id), {
        comprobanteUrl: deleteField(),
        comprobantePath: deleteField(),
        comprobanteAt: deleteField(),
        comprobanteRejected: true,
        updatedAt: serverTimestamp(),
      });
      setTurno((prev) => {
        const next = { ...prev };
        delete next.comprobanteUrl;
        return { ...next, comprobanteRejected: true };
      });
      setMessage("Comprobante rechazado. El usuario deberá subir uno nuevo.");
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Planilla ──
  const handleItemChange = (index, field, value) => {
    setPlanillaData((prev) => {
      const items = [...prev.items];
      // Keep raw string for numeric fields so user can clear/type freely
      const item = { ...items[index], [field]: value };
      item.subtotal = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
      items[index] = item;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setPlanillaData((prev) => ({
      ...prev,
      items: [...prev.items, { ...DEFAULT_ITEM }],
    }));
  };

  const removeItem = (index) => {
    setPlanillaData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calcSubtotal = () => planillaData.items.reduce((s, item) => s + Number(item.subtotal || 0), 0);
  const calcTotal = () => {
    const sub = calcSubtotal();
    const disc = Number(planillaData.descuentoPercent || 0);
    return disc > 0 ? Math.round(sub * (1 - disc / 100)) : sub;
  };

  // Get or generate presupuesto number
  const getNextPresupuestoNumber = async () => {
    let number = "";
    const configRef = doc(db, "servicioConfig", "default");
    await runTransaction(db, async (t) => {
      const cfgSnap = await t.get(configRef);
      const prefix = cfgSnap.data()?.presupuestoPrefix || "AG";
      const next = (cfgSnap.data()?.nextPresupuestoNumber || 1);
      number = `${prefix}-${String(next).padStart(4, "0")}`;
      t.update(configRef, { nextPresupuestoNumber: next + 1, updatedAt: serverTimestamp() });
    });
    return number;
  };

  const handleSavePlanilla = async (complete = false) => {
    setSaving(true);
    setMessage("");
    try {
      let presupuestoNumber = turno?.planilla?.presupuestoNumber;
      if (!presupuestoNumber) {
        presupuestoNumber = await getNextPresupuestoNumber();
      }

      const subtotal = calcSubtotal();
      const totalAPagar = calcTotal();

      const planilla = {
        presupuestoNumber,
        tecnico: planillaData.tecnico,
        observaciones: planillaData.observaciones,
        formaDePago: planillaData.formaDePago,
        items: planillaData.items,
        subtotal,
        descuentoPercent: Number(planillaData.descuentoPercent),
        totalAPagar,
        estado: complete ? "Completado" : "En proceso",
      };

      const updates = {
        planilla,
        updatedAt: serverTimestamp(),
      };

      if (complete) {
        updates.status = "completed";
        updates.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, "servicioTurnos", id), updates);
      setTurno((prev) => ({ ...prev, planilla, ...(complete ? { status: "completed" } : {}) }));
      setMessage(complete ? "Servicio marcado como completado. Se enviará email al cliente." : "Planilla guardada correctamente.");
    } catch (err) {
      setMessage("Error al guardar planilla: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendPresupuesto = async () => {
    setSaving(true);
    setMessage("");
    try {
      let presupuestoNumber = turno?.planilla?.presupuestoNumber;
      if (!presupuestoNumber) {
        presupuestoNumber = await getNextPresupuestoNumber();
      }

      const subtotal = calcSubtotal();
      const totalAPagar = calcTotal();

      const planilla = {
        presupuestoNumber,
        tecnico: planillaData.tecnico,
        observaciones: planillaData.observaciones,
        formaDePago: planillaData.formaDePago,
        items: planillaData.items,
        subtotal,
        descuentoPercent: Number(planillaData.descuentoPercent),
        totalAPagar,
        estado: "Enviado al cliente",
      };

      await updateDoc(doc(db, "servicioTurnos", id), {
        planilla,
        status: "presupuesto_enviado",
        partsTotal: totalAPagar,
        presupuestoEnviadoAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTurno((prev) => ({ ...prev, planilla, status: "presupuesto_enviado", partsTotal: totalAPagar }));
      setShowPlanilla(false);
      setMessage("Presupuesto enviado al cliente. El cliente recibirá un email para aprobarlo.");
    } catch (err) {
      setMessage("Error al enviar presupuesto: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPartsPayment = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateDoc(doc(db, "servicioTurnos", id), {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setTurno((prev) => ({ ...prev, status: "completed" }));
      setMessage("Pago de repuestos confirmado. Servicio marcado como completado.");
    } catch (err) {
      setMessage("Error al confirmar pago: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = () => {
    if (!turno) return;
    const turnoWithPlanilla = {
      ...turno,
      planilla: {
        ...planillaData,
        presupuestoNumber: turno.planilla?.presupuestoNumber || "BORRADOR",
        subtotal: calcSubtotal(),
        totalAPagar: calcTotal(),
      },
    };
    generatePresupuestoPDF(turnoWithPlanilla);
  };

  if (loading) return <div className="admin-container"><AdminSidebar /><div className="admin-content"><p>Cargando...</p></div></div>;
  if (!turno) return <div className="admin-container"><AdminSidebar /><div className="admin-content"><p>Turno no encontrado</p></div></div>;

  const t = turno;
  const statusColor = STATUS_COLORS[t.status] || "#555";
  const serviceLabel = t.serviceType === "tecnico"
    ? "Servicio Técnico (Diagnóstico + Reparación)"
    : `Service de Mantenimiento — ${t.maintenanceSubtype} ${t.maintenanceVariant}`;

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <button
              onClick={() => navigate("/admin/servicio")}
              style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: 0, marginBottom: 8 }}
            >
              ← Volver a turnos
            </button>
            <h1 style={{ color: "#fff", margin: 0, fontSize: 22 }}>Turno #{t.id.slice(0, 8)}…</h1>
            <p style={{ color: "#888", margin: "4px 0 0", fontSize: 13 }}>Fecha: {t.scheduledDate}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span style={{ padding: "6px 14px", borderRadius: 8, background: statusColor, color: "#fff", fontWeight: 800, fontSize: 13 }}>
              {STATUS_LABELS[t.status] || t.status}
            </span>
            {t.isRedeemed && (
              <span style={{ padding: "4px 10px", borderRadius: 6, background: "#92400e", color: "#fbbf24", fontWeight: 800, fontSize: 11 }}>
                ⭐ CANJEADO CON PUNTOS
              </span>
            )}
          </div>
        </div>

        {message && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontWeight: 700, fontSize: 14,
            background: message.includes("Error") ? "rgba(220,38,38,0.1)" : "rgba(200,244,0,0.08)",
            border: `1px solid ${message.includes("Error") ? "rgba(220,38,38,0.3)" : "rgba(200,244,0,0.3)"}`,
            color: message.includes("Error") ? "#f87171" : "#c8f400",
          }}>
            {message}
          </div>
        )}

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
          {/* Client */}
          <InfoCard title="Cliente">
            <InfoRow label="Nombre" value={t.user?.name} />
            <InfoRow label="Email" value={t.user?.email} />
            <InfoRow label="Teléfono" value={t.user?.phone} />
            {t.user?.instagram && <InfoRow label="Instagram" value={t.user.instagram} />}
          </InfoCard>

          {/* Replica */}
          <InfoCard title="Réplica" action={
            replicaEdit
              ? <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={handleSaveReplica} disabled={savingReplica} style={{ background: "#c8f400", color: "#000", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
                    {savingReplica ? "..." : "Guardar"}
                  </button>
                  <button onClick={() => setReplicaEdit(null)} style={{ background: "transparent", color: "#888", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              : <button onClick={() => setReplicaEdit({ gearbox: t.replica?.gearbox || "", fpsEstimado: t.replica?.fpsEstimado || "", serie: t.replica?.serie || "", marca: t.replica?.marca || "", modelo: t.replica?.modelo || "", tipo: t.replica?.tipo || "" })} style={{ background: "transparent", color: "#c8f400", border: "1px solid rgba(200,244,0,0.3)", borderRadius: 6, padding: "4px 10px", fontWeight: 900, fontSize: 12, cursor: "pointer" }}>
                  Editar
                </button>
          }>
            {replicaEdit ? (
              <div style={{ display: "grid", gap: 8 }}>
                {[
                  { key: "marca", label: "Marca" },
                  { key: "modelo", label: "Modelo" },
                  { key: "tipo", label: "Tipo" },
                  { key: "gearbox", label: "Gearbox" },
                  { key: "fpsEstimado", label: "FPS" },
                  { key: "serie", label: "N° Serie" },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#888", fontSize: 12, fontWeight: 700, minWidth: 70 }}>{label}</span>
                    <input
                      value={replicaEdit[key]}
                      onChange={(e) => setReplicaEdit((prev) => ({ ...prev, [key]: e.target.value }))}
                      style={{ flex: 1, background: "#242424", border: "1px solid #333", borderRadius: 6, padding: "5px 8px", color: "#fff", fontSize: 13, fontWeight: 700, outline: "none" }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <InfoRow label="Marca" value={t.replica?.marca} />
                <InfoRow label="Modelo" value={t.replica?.modelo} />
                <InfoRow label="Tipo" value={t.replica?.tipo} />
                {t.replica?.gearbox && <InfoRow label="Gearbox" value={t.replica.gearbox} />}
                {t.replica?.fpsEstimado && <InfoRow label="FPS" value={t.replica.fpsEstimado} />}
                {t.replica?.serie && <InfoRow label="N° Serie" value={t.replica.serie} />}
              </>
            )}
          </InfoCard>

          {/* Service */}
          <InfoCard title="Servicio solicitado">
            <InfoRow label="Tipo" value={serviceLabel} />
            {t.serviceType === "tecnico" && t.fallaReportada && (
              <div style={{ padding: "6px 0" }}>
                <div style={{ color: "#888", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Falla reportada</div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{t.fallaReportada}</div>
              </div>
            )}
            {(t.addons || []).length > 0 && (
              <InfoRow label="Mejoras" value={t.addons.map((a) => a.name).join(", ")} />
            )}
          </InfoCard>

          {/* Pricing */}
          <InfoCard title="Precio">
            <InfoRow label="Servicio" value={`$${Number(t.pricing?.serviceFee || 0).toLocaleString("es-AR")}`} />
            {Number(t.pricing?.addonsTotal) > 0 && (
              <InfoRow label="Mejoras" value={`+$${Number(t.pricing.addonsTotal).toLocaleString("es-AR")}`} />
            )}
            <InfoRow
              label={t.planilla ? "Total cobrado" : "Total estimado"}
              value={`$${Number(t.planilla?.totalAPagar || t.pricing?.total || 0).toLocaleString("es-AR")}`}
              accent
            />
          </InfoCard>
        </div>

        {/* ── Comprobante de pago ── */}
        {t.status === "approved" && t.comprobanteUrl && (
          <div style={{ background: "rgba(200,244,0,0.04)", border: "1px solid rgba(200,244,0,0.25)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c8f400", boxShadow: "0 0 8px #c8f400" }} />
                <span style={{ color: "#c8f400", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Comprobante de pago recibido
                </span>
              </div>
              {t.comprobanteAt?.toDate && (
                <span style={{ color: "#555", fontSize: 12, fontWeight: 600 }}>
                  {t.comprobanteAt.toDate().toLocaleString("es-AR")}
                </span>
              )}
            </div>

            {/* Body */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <a
                href={t.comprobanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(200,244,0,0.1)", border: "1px solid rgba(200,244,0,0.3)",
                  color: "#c8f400", fontWeight: 700, fontSize: 13,
                  padding: "8px 14px", borderRadius: 8, textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Ver comprobante
              </a>

              <div style={{ flex: 1 }} />

              <button
                onClick={handleConfirmPayment}
                disabled={saving}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#c8f400", color: "#000", border: "none",
                  borderRadius: 8, padding: "10px 20px", cursor: "pointer",
                  fontWeight: 800, fontSize: 13, opacity: saving ? 0.6 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Confirmar pago
              </button>
              <button
                onClick={handleRejectComprobante}
                disabled={saving}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "transparent", border: "1px solid rgba(220,38,38,0.4)",
                  color: "#f87171", borderRadius: 8, padding: "10px 16px",
                  cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: saving ? 0.6 : 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Rechazar
              </button>
            </div>
          </div>
        )}

        {/* ── Parts payment review section ── */}
        {t.status === "parts_payment_review" && (
          <div style={{ background: "rgba(251,146,60,0.04)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fb923c", boxShadow: "0 0 8px #fb923c" }} />
                <span style={{ color: "#fb923c", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                  Comprobante de repuestos recibido
                </span>
              </div>
              {t.partsComprobanteAt?.toDate && (
                <span style={{ color: "#555", fontSize: 12, fontWeight: 600 }}>
                  {t.partsComprobanteAt.toDate().toLocaleString("es-AR")}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {t.partsComprobanteUrl && (
                <a
                  href={t.partsComprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)",
                    color: "#fb923c", fontWeight: 700, fontSize: 13,
                    padding: "8px 14px", borderRadius: 8, textDecoration: "none",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Ver comprobante de repuestos
                </a>
              )}
              <div style={{ color: "#888", fontSize: 13, fontWeight: 700 }}>
                Monto: <span style={{ color: "#fb923c", fontWeight: 900 }}>${Number(t.partsTotal || 0).toLocaleString("es-AR")}</span>
              </div>
              <div style={{ flex: 1 }} />
              <button
                onClick={handleConfirmPartsPayment}
                disabled={saving}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#c8f400", color: "#000", border: "none",
                  borderRadius: 8, padding: "10px 20px", cursor: "pointer",
                  fontWeight: 800, fontSize: 13, opacity: saving ? 0.6 : 1,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Confirmar pago → Completar
              </button>
            </div>
          </div>
        )}

        {/* ── Presupuesto rechazado notice ── */}
        {t.status === "presupuesto_rechazado" && (
          <div style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
            <p style={{ color: "#f87171", fontWeight: 800, fontSize: 14, margin: "0 0 4px" }}>El cliente rechazó el presupuesto</p>
            {t.rejectionReason && <p style={{ color: "#888", fontSize: 13, fontWeight: 600, margin: 0 }}>Motivo: {t.rejectionReason}</p>}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {t.status === "pending_approval" && (
            <>
              <button
                className="af-save-btn"
                onClick={handleApprove}
                disabled={saving}
              >
                ✓ Aprobar turno
              </button>
              {!showRejectInput ? (
                <button
                  onClick={() => setShowRejectInput(true)}
                  style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.4)", color: "#f87171", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                >
                  ✕ Rechazar
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8, flex: 1 }}>
                  <input
                    className="af-input"
                    style={{ flex: 1 }}
                    placeholder="Motivo del rechazo..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                  >
                    Confirmar rechazo
                  </button>
                  <button
                    onClick={() => setShowRejectInput(false)}
                    style={{ background: "transparent", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}

          {t.status === "approved" && (
            <button className="af-save-btn" onClick={handleMarkInProgress} disabled={saving}>
              → Marcar En Proceso
            </button>
          )}

          {(t.status === "in_progress" || t.status === "approved") && (
            <button
              className="af-save-btn"
              style={{ background: "transparent", border: "1px solid #c8f400", color: "#c8f400" }}
              onClick={() => setShowPlanilla((p) => !p)}
            >
              📋 {showPlanilla ? "Cerrar planilla" : "Editar planilla"}
            </button>
          )}

          {(t.status === "presupuesto_enviado" || t.status === "presupuesto_aprobado") && (
            <button
              className="af-save-btn"
              style={{ background: "transparent", border: "1px solid #c8f400", color: "#c8f400" }}
              onClick={() => setShowPlanilla((p) => !p)}
            >
              📋 {showPlanilla ? "Cerrar planilla" : "Editar planilla"}
            </button>
          )}

          {(t.status === "completed" || t.status === "presupuesto_enviado" || t.status === "presupuesto_aprobado" || t.status === "parts_payment_review") && t.planilla && (
            <button className="af-save-btn" onClick={handleGeneratePDF}>
              📄 Descargar PDF
            </button>
          )}
        </div>

        {/* ── Planilla editor ── */}
        {showPlanilla && (
          <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h2 style={{ color: "#c8f400", fontSize: 18, fontWeight: 800, margin: "0 0 20px" }}>
              Planilla / Presupuesto de Servicio
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
              {/* LEFT: form */}
              <div>
                <div className="af-row">
                  <div className="af-field">
                    <label className="af-label">Técnico</label>
                    <input
                      className="af-input"
                      value={planillaData.tecnico}
                      onChange={(e) => setPlanillaData((p) => ({ ...p, tecnico: e.target.value }))}
                    />
                  </div>
                  <div className="af-field">
                    <label className="af-label">Forma de pago</label>
                    <select
                      className="af-input"
                      value={planillaData.formaDePago}
                      onChange={(e) => setPlanillaData((p) => ({ ...p, formaDePago: e.target.value }))}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta de débito">Tarjeta de débito</option>
                      <option value="Tarjeta de crédito">Tarjeta de crédito</option>
                      <option value="MercadoPago">MercadoPago</option>
                    </select>
                  </div>
                </div>

                <div className="af-field" style={{ marginTop: 12 }}>
                  <label className="af-label">Observaciones del técnico</label>
                  <textarea
                    className="af-input"
                    style={{ minHeight: 80, resize: "vertical", fontFamily: "Montserrat, sans-serif" }}
                    value={planillaData.observaciones}
                    onChange={(e) => setPlanillaData((p) => ({ ...p, observaciones: e.target.value }))}
                    placeholder="Descripción del trabajo realizado, repuestos instalados, recomendaciones..."
                  />
                </div>

                {/* Items table */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h3 style={{ color: "#fff", fontSize: 15, fontWeight: 800, margin: 0 }}>Ítems del trabajo</h3>
                    <button type="button" className="af-save-btn" style={{ padding: "7px 14px", fontSize: 12 }} onClick={addItem}>
                      + Agregar ítem
                    </button>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#242424" }}>
                          {["#", "Descripción", "Tipo", "Cant.", "P. Unit.", "Subtotal", ""].map((h) => (
                            <th key={h} style={{ padding: "8px 10px", color: "#888", fontSize: 12, fontWeight: 700, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {planillaData.items.map((item, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #2a2a2a" }}>
                            <td style={{ padding: "6px 10px", color: "#888", fontSize: 13, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</td>
                            <td style={{ padding: "6px 10px" }}>
                              <input className="af-input" style={{ minWidth: 160, fontSize: 13, padding: "6px 10px" }} value={item.descripcion} onChange={(e) => handleItemChange(i, "descripcion", e.target.value)} placeholder="Descripción..." />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <select className="af-input" style={{ fontSize: 12, padding: "6px 10px" }} value={item.tipo} onChange={(e) => handleItemChange(i, "tipo", e.target.value)}>
                                <option value="Mano de obra">Mano de obra</option>
                                <option value="Repuesto + M.O.">Repuesto + M.O.</option>
                              </select>
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <input className="af-input" type="number" style={{ width: 56, fontSize: 13, padding: "6px 8px" }} value={item.cantidad} onChange={(e) => handleItemChange(i, "cantidad", e.target.value)} min="1" />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <input className="af-input" type="number" style={{ width: 100, fontSize: 13, padding: "6px 8px" }} value={item.precioUnitario} onChange={(e) => handleItemChange(i, "precioUnitario", e.target.value)} min="0" />
                            </td>
                            <td style={{ padding: "6px 10px", color: "#c8f400", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>
                              ${Number(item.subtotal || 0).toLocaleString("es-AR")}
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <button onClick={() => removeItem(i)} style={{ background: "rgba(220,38,38,0.15)", border: "none", color: "#f87171", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <div style={{ background: "#242424", borderRadius: 10, padding: "14px 20px", minWidth: 280 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", color: "#888", fontSize: 13, fontWeight: 700 }}>
                        <span>Subtotal</span><span>${calcSubtotal().toLocaleString("es-AR")}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", color: "#888", fontSize: 13, fontWeight: 700, gap: 8 }}>
                        <span>Descuento (%)</span>
                        <input type="number" min="0" max="100" style={{ width: 60, background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, color: "#fff", padding: "4px 8px", fontWeight: 700, fontSize: 13, textAlign: "center" }} value={planillaData.descuentoPercent} onChange={(e) => setPlanillaData((p) => ({ ...p, descuentoPercent: e.target.value }))} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 0", borderTop: "1px solid #333", marginTop: 4 }}>
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>TOTAL</span>
                        <span style={{ color: "#c8f400", fontWeight: 900, fontSize: 20 }}>${calcTotal().toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Planilla actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                  <button className="af-save-btn" onClick={() => handleSavePlanilla(false)} disabled={saving}>Guardar borrador</button>
                  <button className="af-save-btn" style={{ background: "transparent", border: "1px solid #c8f400", color: "#c8f400" }} onClick={handleGeneratePDF}>Descargar PDF</button>
                  <button className="af-save-btn" style={{ background: "#60a5fa", color: "#000" }} onClick={handleSendPresupuesto} disabled={saving}>
                    📤 Enviar presupuesto al cliente
                  </button>
                  {t.serviceType === "mantenimiento" && (
                    <button className="af-save-btn" style={{ background: "#c8f400", color: "#000" }} onClick={() => handleSavePlanilla(true)} disabled={saving}>
                      ✓ Completar servicio directamente
                    </button>
                  )}
                </div>
              </div>

              {/* RIGHT: live preview */}
              <div style={{ position: "sticky", top: 20 }}>
                <p style={{ color: "#888", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Preview</p>
                <PresupuestoPreview turno={t} planillaData={planillaData} subtotal={calcSubtotal()} total={calcTotal()} presupuestoNumber={t.planilla?.presupuestoNumber || "BORRADOR"} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper components
function InfoCard({ title, children, action }) {
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ color: "#c8f400", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "5px 0", borderBottom: "1px solid #222" }}>
      <span style={{ color: "#888", fontSize: 12, fontWeight: 700 }}>{label}</span>
      <span style={{ color: accent ? "#c8f400" : "#fff", fontSize: 13, fontWeight: accent ? 900 : 700, textAlign: "right" }}>
        {value || "—"}
      </span>
    </div>
  );
}

// ── Presupuesto live preview ──────────────────────────────────────────────────
function PresupuestoPreview({ turno, planillaData, subtotal, total, presupuestoNumber }) {
  const t = turno;
  const user = t.user || {};
  const replica = t.replica || {};
  const fecha = new Date().toLocaleDateString("es-AR");
  const serviceLabel = t.serviceType === "tecnico" ? "SERVICIO TÉCNICO" : "SERVICE DE MANTENIMIENTO";
  const fallaText = t.fallaReportada || (t.serviceType === "mantenimiento" ? `Service de Mantenimiento — ${t.maintenanceSubtype || ""} ${t.maintenanceVariant || ""}` : "—");

  const s = { // shared mini-styles
    label:  { fontSize: 8, color: "#777", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 },
    value:  { fontSize: 8.5, color: "#111", fontWeight: 600, textAlign: "right" },
    row:    { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "3px 5px", gap: 4 },
    secHdr: { background: "#228b22", color: "#fff", fontSize: 7.5, fontWeight: 800, padding: "3px 5px", letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 0 },
  };

  const PreviewRow = ({ label, value, alt }) => (
    <div style={{ ...s.row, background: alt ? "#f5f5f5" : "#fff" }}>
      <span style={s.label}>{label}</span>
      <span style={s.value}>{value || "—"}</span>
    </div>
  );

  return (
    <div style={{
      background: "#fff", borderRadius: 8, overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: 9, fontFamily: "helvetica, sans-serif",
      border: "1px solid #ddd",
    }}>
      {/* Header */}
      <div style={{ background: "#0f0f0f", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 14, lineHeight: 1 }}>GENESIS</div>
          <div style={{ color: "#c8f400", fontWeight: 900, fontSize: 14, lineHeight: 1 }}>AIRSOFT</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>PRESUPUESTO</div>
          <div style={{ color: "#c8f400", fontSize: 8, fontStyle: "italic" }}>{serviceLabel}</div>
          <div style={{ color: "#888", fontSize: 7 }}>genesisairsoft.com.ar</div>
        </div>
      </div>
      <div style={{ height: 2, background: "#228b22" }} />

      {/* Two-col: datos presupuesto + cliente */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        <div style={{ borderRight: "1px solid #eee" }}>
          <div style={s.secHdr}>Datos del presupuesto</div>
          {[
            ["N° Presupuesto", presupuestoNumber, true],
            ["Fecha", fecha, false],
            ["Válido", "15 días", true],
            ["Técnico", planillaData.tecnico, false],
          ].map(([l, v, a]) => <PreviewRow key={l} label={l} value={v} alt={a} />)}
        </div>
        <div>
          <div style={s.secHdr}>Datos del cliente</div>
          {[
            ["Cliente", user.name, true],
            ["Teléfono", user.phone, false],
            ["Email", user.email, true],
            ["Forma de pago", planillaData.formaDePago, false],
          ].map(([l, v, a]) => <PreviewRow key={l} label={l} value={v} alt={a} />)}
        </div>
      </div>

      {/* Réplica */}
      <div style={s.secHdr}>Datos de la réplica</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {[
          ["Marca", replica.marca, true], ["Tipo", replica.tipo, true],
          ["Modelo", replica.modelo, false], ["Gearbox", replica.gearbox, false],
          ["N° Serie", replica.serie, true], ["FPS", replica.fpsEstimado, true],
        ].map(([l, v, a]) => <PreviewRow key={l} label={l} value={v} alt={a} />)}
      </div>

      {/* Falla */}
      <div style={s.secHdr}>Falla reportada</div>
      <div style={{ background: "#fafafa", padding: "4px 5px", fontSize: 8, color: "#333", lineHeight: 1.4, minHeight: 20 }}>{fallaText}</div>

      {/* Observaciones */}
      <div style={s.secHdr}>Observaciones</div>
      <div style={{ background: "#fafafa", padding: "4px 5px", fontSize: 8, color: "#333", lineHeight: 1.4, minHeight: 24 }}>{planillaData.observaciones || "—"}</div>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#228b22" }}>
            {["#", "Descripción", "Tipo", "Cant.", "P.Unit.", "Sub."].map((h) => (
              <th key={h} style={{ padding: "3px 4px", color: "#fff", fontSize: 7, fontWeight: 800, textAlign: "left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...planillaData.items, ...Array(Math.max(0, 3 - planillaData.items.length)).fill(null)].map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8f8f8", borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "3px 4px", color: "#888", fontSize: 7, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</td>
              <td style={{ padding: "3px 4px", fontSize: 7, color: "#222", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item?.descripcion || ""}</td>
              <td style={{ padding: "3px 4px", fontSize: 7, color: "#666", fontStyle: "italic" }}>{item?.tipo || ""}</td>
              <td style={{ padding: "3px 4px", fontSize: 7, color: "#222" }}>{item?.cantidad || ""}</td>
              <td style={{ padding: "3px 4px", fontSize: 7, color: "#222" }}>{item?.precioUnitario ? `$${Number(item.precioUnitario).toLocaleString("es-AR")}` : ""}</td>
              <td style={{ padding: "3px 4px", fontSize: 7, color: "#222", fontWeight: 700 }}>{item?.subtotal ? `$${Number(item.subtotal).toLocaleString("es-AR")}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", background: "#f5f5f5", borderTop: "1px solid #ddd" }}>
        <div style={{ minWidth: 140, padding: "6px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#666", padding: "2px 0" }}>
            <span>Subtotal</span><span>${subtotal.toLocaleString("es-AR")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#666", padding: "2px 0" }}>
            <span>Descuento</span><span>{planillaData.descuentoPercent || 0}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 900, padding: "4px 0 2px", borderTop: "1px solid #228b22", marginTop: 3, background: "#228b22", margin: "3px -8px -6px", padding: "4px 8px" }}>
            <span style={{ color: "#fff" }}>TOTAL A PAGAR</span>
            <span style={{ color: "#fff" }}>${total.toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#f0f0f0", padding: "4px 8px", textAlign: "center", fontSize: 7, color: "#888", borderTop: "1px solid #ddd", marginTop: 6 }}>
        genesisairsoft.com.ar | @genesis.airsoft | Buenos Aires, Argentina
      </div>
    </div>
  );
}
