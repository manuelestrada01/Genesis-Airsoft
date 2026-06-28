import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import AuthContext from "../../context/AuthContext";
import { generatePresupuestoPDF } from "../../utils/generatePresupuestoPDF";
import ConfirmDialog from "../ui/ConfirmDialog";
import "./ServicioTurnoStatus.css";
import { POINTS_ENABLED } from "./ServicioPage";

const CANCEL_URL = "https://us-central1-genesis-airsoft.cloudfunctions.net/cancelServicioTurno";
const APPROVE_PRESUPUESTO_URL = "https://us-central1-genesis-airsoft.cloudfunctions.net/approvePresupuesto";

const STATUS_CONFIG = {
  pending_approval:      { label: "Pendiente de aprobación",             color: "#c8f400", textColor: "#000", icon: "clock" },
  approved:              { label: "Aprobado",                             color: "#c8f400", textColor: "#000", icon: "check" },
  payment_review:        { label: "Esperando confirmación de pago",       color: "#c8f400", textColor: "#000", icon: "card" },
  in_progress:           { label: "En proceso",                           color: "#fb923c", textColor: "#000", icon: "wrench" },
  presupuesto_enviado:   { label: "Presupuesto listo para revisar",       color: "#60a5fa", textColor: "#000", icon: "doc" },
  presupuesto_aprobado:  { label: "Presupuesto aprobado",                 color: "#c8f400", textColor: "#000", icon: "check" },
  parts_payment_review:  { label: "Pago de repuestos en revisión",        color: "#fb923c", textColor: "#000", icon: "card" },
  presupuesto_rechazado: { label: "Presupuesto rechazado",                color: "#f87171", textColor: "#fff", icon: "x" },
  completed:             { label: "Completado",                           color: "#c8f400", textColor: "#000", icon: "check" },
  cancelled:             { label: "Cancelado",                            color: "#6b7280", textColor: "#fff", icon: "x" },
  rejected:              { label: "Rechazado",                            color: "#f87171", textColor: "#fff", icon: "x" },
};

const StatusIcon = ({ type, color }) => {
  const s = { width: 32, height: 32, fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "clock")  return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  if (type === "check")  return <svg viewBox="0 0 24 24" style={s}><polyline points="20 6 9 17 4 12"/></svg>;
  if (type === "card")   return <svg viewBox="0 0 24 24" style={s}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  if (type === "wrench") return <svg viewBox="0 0 24 24" style={s}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
  if (type === "x")      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
  if (type === "doc")    return <svg viewBox="0 0 24 24" style={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  return null;
};

export default function ServicioTurnoStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [turno, setTurno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelDialog, setCancelDialog] = useState(false);
  const [config, setConfig] = useState(null);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [uploadError, setUploadError] = useState("");
  // Presupuesto approval
  const [approvingPresupuesto, setApprovingPresupuesto] = useState(false);
  const [presupuestoError, setPresupuestoError] = useState("");
  const [showRejectPresupuesto, setShowRejectPresupuesto] = useState(false);
  const [rejectPresupuestoReason, setRejectPresupuestoReason] = useState("");
  // Parts payment upload
  const [uploadingParts, setUploadingParts] = useState(false);
  const [uploadPartsError, setUploadPartsError] = useState("");

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "servicioTurnos", id), (snap) => {
      if (snap.exists()) setTurno({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    getDoc(doc(db, "servicioConfig", "default")).then((snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
    return () => unsub();
  }, [id]);

  const handleComprobanteUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) { setUploadError("Solo se aceptan imágenes (JPG, PNG, WebP) o PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("El archivo no puede superar los 10MB."); return; }
    setUploadError("");
    setUploadingComprobante(true);
    try {
      await user.getIdToken(true);
      const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
      const path = `servicioTurnos/${id}/${user.uid}/${Date.now()}-${safeName}`;
      const sRef = ref(storage, path);
      const url = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file, { contentType: file.type });
        task.on("state_changed", null, reject, () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject));
      });
      await updateDoc(doc(db, "servicioTurnos", id), {
        comprobanteUrl: url, comprobantePath: path,
        comprobanteAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error subiendo comprobante:", err);
      setUploadError("Error al subir el comprobante. Intentá de nuevo.");
    } finally {
      setUploadingComprobante(false);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    setCancelError(""); setCancelling(true);
    try {
      const token = await user.getIdToken();
      const resp = await fetch(CANCEL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ turnoId: id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Error al cancelar");
    } catch (err) {
      setCancelError(err.message || "Error al cancelar");
    } finally {
      setCancelling(false);
    }
  };

  const handleApprovePresupuesto = async () => {
    if (!user) return;
    setPresupuestoError(""); setApprovingPresupuesto(true);
    try {
      const token = await user.getIdToken();
      const resp = await fetch(APPROVE_PRESUPUESTO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ turnoId: id, action: "approve" }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Error al aprobar");
    } catch (err) {
      setPresupuestoError(err.message || "Error al aprobar el presupuesto");
    } finally {
      setApprovingPresupuesto(false);
    }
  };

  const handleRejectPresupuesto = async () => {
    if (!user) return;
    setPresupuestoError(""); setApprovingPresupuesto(true);
    try {
      const token = await user.getIdToken();
      const resp = await fetch(APPROVE_PRESUPUESTO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ turnoId: id, action: "reject", rejectionReason: rejectPresupuestoReason }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Error al rechazar");
      setShowRejectPresupuesto(false);
    } catch (err) {
      setPresupuestoError(err.message || "Error al rechazar el presupuesto");
    } finally {
      setApprovingPresupuesto(false);
    }
  };

  const handlePartsComprobanteUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) { setUploadPartsError("Solo se aceptan imágenes (JPG, PNG, WebP) o PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadPartsError("El archivo no puede superar los 10MB."); return; }
    setUploadPartsError("");
    setUploadingParts(true);
    try {
      await user.getIdToken(true);
      const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
      const path = `servicioTurnos/${id}/${user.uid}/parts-${Date.now()}-${safeName}`;
      const sRef = ref(storage, path);
      const url = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file, { contentType: file.type });
        task.on("state_changed", null, reject, () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject));
      });
      await updateDoc(doc(db, "servicioTurnos", id), {
        partsComprobanteUrl: url,
        partsComprobantePath: path,
        partsComprobanteAt: serverTimestamp(),
        status: "parts_payment_review",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error subiendo comprobante de repuestos:", err);
      setUploadPartsError("Error al subir el comprobante. Intentá de nuevo.");
    } finally {
      setUploadingParts(false);
    }
  };

  if (loading) return <div className="sts-page"><p className="sts-loading">Cargando turno...</p></div>;
  if (!turno) return <div className="sts-page"><p className="sts-loading">Turno no encontrado</p></div>;

  const t = turno;
  const effectiveStatus = t.status === "approved" && t.comprobanteUrl ? "payment_review" : t.status;
  const st = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending_approval;
  const pricing = t.pricing || {};
  const planilla = t.planilla;

  const serviceLabel = t.serviceType === "tecnico"
    ? "Servicio Técnico"
    : `Service ${t.maintenanceSubtype || ""} ${t.maintenanceVariant || ""}`;

  const locToShow = (() => {
    const turnoLoc = t.location;
    if (turnoLoc?.mapsUrl) return [turnoLoc];
    return (config?.locations || []).filter(l => l.mapsUrl);
  })();

  return (
    <div className="sts-page">
      <ConfirmDialog
        isOpen={cancelDialog}
        title="Cancelar turno"
        message="¿Cancelar este turno? Esta acción no se puede deshacer."
        confirmLabel="Cancelar turno"
        danger
        onConfirm={() => { setCancelDialog(false); handleCancel(); }}
        onCancel={() => setCancelDialog(false)}
      />

      <div className="sts-wrapper">
      <button className="sts-back" onClick={() => navigate("/profile")}>
        ← Volver a mis servicios
      </button>

      <div className="sts-card">

        {/* Animated status icon */}
        <div className="sts-icon-wrap">
          <div className="sts-icon-ring" style={{ borderColor: st.color, boxShadow: `0 0 20px ${st.color}44` }} />
          <div className="sts-icon-inner">
            <StatusIcon type={st.icon} color={st.color} />
          </div>
        </div>

        {/* Title */}
        <div className="sts-hero">
          <h1 className="sts-hero-title" style={{ color: st.color }}>
            {t.isRedeemed && "⭐ "}{st.label}
          </h1>
          <p className="sts-hero-id">Turno #{t.id}</p>
          {t.isRedeemed && <p className="sts-redeemed-badge">Canjeado con puntos Genesis</p>}
        </div>

        {/* Info rows */}
        <div className="sts-details">
          <div className="sts-detail-row">
            <span>Servicio</span><span>{serviceLabel}</span>
          </div>
          <div className="sts-detail-row">
            <span>Fecha turno</span><span>{t.scheduledDate}</span>
          </div>
          <div className="sts-detail-row">
            <span>Réplica</span><span>{t.replica?.marca} {t.replica?.modelo} ({t.replica?.tipo})</span>
          </div>
          {t.serviceType === "tecnico" && t.fallaReportada && (
            <div className="sts-detail-row sts-detail-row--falla">
              <span>Falla reportada</span>
              <span className="sts-falla-text">{t.fallaReportada}</span>
            </div>
          )}
          {t.addons?.length > 0 && (
            <div className="sts-detail-row">
              <span>Mejoras</span><span>{t.addons.map((a) => a.name).join(", ")}</span>
            </div>
          )}
        </div>

        {/* Status messages */}
        {t.status === "pending_approval" && (
          <div className="sts-message sts-message--pending">
            Tu turno fue recibido y está esperando aprobación del técnico. Te notificaremos por email.
          </div>
        )}

        {t.status === "approved" && !t.isRedeemed && (
          <div className="sts-payment-block">
            {t.comprobanteUrl ? (
              <>
                <div className="sts-message sts-message--approved">
                  Comprobante recibido. Esperando confirmación del técnico.
                </div>
                <div className="sts-comprobante-preview">
                  <span className="sts-comprobante-label">Comprobante enviado</span>
                  <a href={t.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="sts-comprobante-link">
                    Ver comprobante ↗
                  </a>
                </div>
              </>
            ) : (
              <div className="sts-payment-card">
                <h3 className="sts-payment-title">Abonar el servicio</h3>
                <p className="sts-payment-subtitle">Tu turno fue aprobado. Realizá la transferencia y subí el comprobante.</p>
                <div className="sts-transfer-info">
                  <div className="sts-transfer-row"><span>Alias</span><strong>{config?.transferAlias || "—"}</strong></div>
                  {config?.transferCVU && <div className="sts-transfer-row"><span>CVU / CBU</span><strong className="sts-transfer-cvu">{config.transferCVU}</strong></div>}
                  {config?.transferHolder && <div className="sts-transfer-row"><span>Titular</span><strong>{config.transferHolder}</strong></div>}
                  <div className="sts-transfer-row sts-transfer-row--total">
                    <span>Monto a transferir</span>
                    <strong>${Number(pricing.total || 0).toLocaleString("es-AR")}</strong>
                  </div>
                </div>
                <div className="sts-upload-section">
                  <p className="sts-upload-label">Subí el comprobante de transferencia</p>
                  <label className="sts-upload-btn" style={{ opacity: uploadingComprobante ? 0.6 : 1, pointerEvents: uploadingComprobante ? "none" : "auto" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {uploadingComprobante ? "Subiendo..." : "Seleccionar archivo"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ position: "absolute", width: 0, height: 0, opacity: 0, overflow: "hidden" }}
                      onChange={handleComprobanteUpload} disabled={uploadingComprobante} />
                  </label>
                  <p className="sts-upload-hint">JPG, PNG, WebP o PDF — máx. 10MB</p>
                  {uploadError && <p className="sts-error">{uploadError}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {t.status === "approved" && t.isRedeemed && (
          <div className="sts-message sts-message--approved">
            Tu turno fue aprobado. Llevá tu réplica en la fecha indicada.
          </div>
        )}

        {/* Maps buttons */}
        {((t.status === "approved" && t.isRedeemed) || t.status === "in_progress") && locToShow.length > 0 && (
          <div className="sts-maps-group">
            {locToShow.map((loc, i) => (
              <a key={i} href={loc.mapsUrl} target="_blank" rel="noopener noreferrer" className="sts-maps-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {loc.name ? `${loc.name} — ` : ""}{loc.address || "Ver ubicación en Maps"}
              </a>
            ))}
          </div>
        )}

        {t.status === "in_progress" && (
          <div className="sts-message sts-message--inprogress">
            Tu réplica ya puede ser atendida por el técnico.
          </div>
        )}

        {/* ── Presupuesto enviado: review + approve/reject ── */}
        {t.status === "presupuesto_enviado" && planilla && (
          <div className="sts-presupuesto-block">
            <div className="sts-presupuesto-header">
              <span className="sts-presupuesto-title">Revisá el presupuesto</span>
              <span className="sts-presupuesto-num">N° {planilla.presupuestoNumber}</span>
            </div>
            <p className="sts-presupuesto-subtitle">El técnico preparó este presupuesto. Revisalo y aprobá o rechazá para continuar.</p>

            {/* Items */}
            <div className="sts-presupuesto-items">
              {planilla.items?.map((item, i) => (
                <div key={i} className="sts-presupuesto-item">
                  <div className="sts-presupuesto-item-desc">
                    <span className="sts-presupuesto-item-name">{item.descripcion || "—"}</span>
                    <span className="sts-presupuesto-item-tipo">{item.tipo} × {item.cantidad}</span>
                  </div>
                  <span className="sts-presupuesto-item-price">${Number(item.subtotal || 0).toLocaleString("es-AR")}</span>
                </div>
              ))}
              {planilla.descuentoPercent > 0 && (
                <div className="sts-presupuesto-item sts-presupuesto-item--discount">
                  <span>Descuento {planilla.descuentoPercent}%</span>
                  <span>-${(Number(planilla.subtotal || 0) - Number(planilla.totalAPagar || 0)).toLocaleString("es-AR")}</span>
                </div>
              )}
              <div className="sts-presupuesto-item sts-presupuesto-item--total">
                <span>Total a pagar</span>
                <span>${Number(planilla.totalAPagar || 0).toLocaleString("es-AR")}</span>
              </div>
            </div>

            {planilla.observaciones && (
              <div className="sts-presupuesto-obs">
                <span>Observaciones del técnico</span>
                <p>{planilla.observaciones}</p>
              </div>
            )}

            <div className="sts-presupuesto-actions">
              <button className="sts-presupuesto-btn sts-presupuesto-btn--pdf" onClick={() => generatePresupuestoPDF(t)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                Descargar presupuesto
              </button>

              <button
                className="sts-presupuesto-btn sts-presupuesto-btn--approve"
                onClick={handleApprovePresupuesto}
                disabled={approvingPresupuesto}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Aprobar presupuesto
              </button>

              {!showRejectPresupuesto ? (
                <button
                  className="sts-presupuesto-btn sts-presupuesto-btn--reject"
                  onClick={() => setShowRejectPresupuesto(true)}
                  disabled={approvingPresupuesto}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Rechazar presupuesto
                </button>
              ) : (
                <div className="sts-reject-form">
                  <textarea
                    className="sts-reject-textarea"
                    placeholder="Motivo del rechazo (opcional)..."
                    value={rejectPresupuestoReason}
                    onChange={(e) => setRejectPresupuestoReason(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="sts-presupuesto-btn sts-presupuesto-btn--reject"
                      style={{ flex: 1 }}
                      onClick={handleRejectPresupuesto}
                      disabled={approvingPresupuesto}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      Confirmar rechazo
                    </button>
                    <button
                      className="sts-presupuesto-btn sts-presupuesto-btn--cancel"
                      style={{ flex: 1 }}
                      onClick={() => setShowRejectPresupuesto(false)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {presupuestoError && <p className="sts-error">{presupuestoError}</p>}
            </div>
          </div>
        )}

        {/* ── Presupuesto aprobado: pay for parts ── */}
        {t.status === "presupuesto_aprobado" && (
          <div className="sts-payment-block">
            {t.partsComprobanteUrl ? (
              <div className="sts-message sts-message--approved">
                Comprobante de repuestos enviado. El técnico confirmará el pago.
              </div>
            ) : (
              <div className="sts-payment-card">
                <h3 className="sts-payment-title">Abonar los repuestos</h3>
                <p className="sts-payment-subtitle">Presupuesto aprobado. Realizá la transferencia por el monto del presupuesto y subí el comprobante.</p>
                <div className="sts-transfer-info">
                  <div className="sts-transfer-row"><span>Alias</span><strong>{config?.transferAlias || "—"}</strong></div>
                  {config?.transferCVU && <div className="sts-transfer-row"><span>CVU / CBU</span><strong className="sts-transfer-cvu">{config.transferCVU}</strong></div>}
                  {config?.transferHolder && <div className="sts-transfer-row"><span>Titular</span><strong>{config.transferHolder}</strong></div>}
                  <div className="sts-transfer-row sts-transfer-row--total">
                    <span>Monto total del presupuesto</span>
                    <strong>${Number(t.partsTotal || planilla?.totalAPagar || 0).toLocaleString("es-AR")}</strong>
                  </div>
                </div>
                <div className="sts-upload-section">
                  <p className="sts-upload-label">Subí el comprobante de transferencia</p>
                  <label className="sts-upload-btn" style={{ opacity: uploadingParts ? 0.6 : 1, pointerEvents: uploadingParts ? "none" : "auto" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {uploadingParts ? "Subiendo..." : "Seleccionar archivo"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ position: "absolute", width: 0, height: 0, opacity: 0, overflow: "hidden" }}
                      onChange={handlePartsComprobanteUpload} disabled={uploadingParts} />
                  </label>
                  <p className="sts-upload-hint">JPG, PNG, WebP o PDF — máx. 10MB</p>
                  {uploadPartsError && <p className="sts-error">{uploadPartsError}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {t.status === "parts_payment_review" && (
          <div className="sts-message sts-message--inprogress">
            Comprobante de repuestos recibido. El técnico confirmará el pago y procederá a comprar los repuestos.
          </div>
        )}

        {t.status === "completed" && (
          <div className="sts-message sts-message--completed">
            Servicio completado.{POINTS_ENABLED && !t.isRedeemed && " Se acreditaron +10 puntos Genesis en tu cuenta."}
          </div>
        )}

        {(t.status === "rejected" || t.status === "presupuesto_rechazado") && t.rejectionReason && (
          <div className="sts-message sts-message--rejected">
            {t.status === "presupuesto_rechazado" ? "Presupuesto rechazado." : "Motivo del rechazo:"} {t.rejectionReason}
          </div>
        )}

        {/* Planilla / PDF */}
        {(t.status === "completed" || t.status === "presupuesto_aprobado" || t.status === "parts_payment_review") && planilla && (
          <div className="sts-planilla-card">
            <h3>Presupuesto / Planilla de servicio</h3>
            <p>N° {planilla.presupuestoNumber} — Técnico: {planilla.tecnico}</p>
            <button className="sts-pdf-btn" onClick={() => generatePresupuestoPDF(t)}>
              Descargar PDF
            </button>
          </div>
        )}

        {/* Pricing */}
        <div className="sts-pricing">
          <h3>Detalle de precios</h3>
          <div className="sts-price-row"><span>Servicio</span><span>${Number(pricing.serviceFee || 0).toLocaleString("es-AR")}</span></div>
          {(t.addons || []).map((a, i) => (
            <div key={i} className="sts-price-row sts-price-row--sub"><span>{a.name}</span><span>+${Number(a.price || 0).toLocaleString("es-AR")}</span></div>
          ))}
          <div className="sts-price-divider" />
          {planilla ? (
            <>
              <div className="sts-price-row"><span>Subtotal</span><span>${Number(planilla.subtotal || 0).toLocaleString("es-AR")}</span></div>
              {planilla.descuentoPercent > 0 && <div className="sts-price-row"><span>Descuento</span><span>-{planilla.descuentoPercent}%</span></div>}
              <div className="sts-price-row sts-price-row--total"><span>Total a pagar</span><span>${Number(planilla.totalAPagar || 0).toLocaleString("es-AR")}</span></div>
            </>
          ) : (
            <div className="sts-price-row sts-price-row--estimate"><span>Total estimado</span><span>${Number(pricing.total || 0).toLocaleString("es-AR")}</span></div>
          )}
        </div>

        {/* Cancel */}
        {t.status === "pending_approval" && (
          <div className="sts-cancel-section">
            <button className="sts-cancel-btn" onClick={() => setCancelDialog(true)} disabled={cancelling}>
              {cancelling ? "Cancelando..." : "Cancelar turno"}
            </button>
            {cancelError && <p className="sts-error">{cancelError}</p>}
          </div>
        )}

        {/* CTA rejected/cancelled/presupuesto_rechazado */}
        {(t.status === "rejected" || t.status === "cancelled" || t.status === "presupuesto_rechazado") && (
          <button className="sts-cta-btn" onClick={() => navigate("/servicio")}>
            Sacar nuevo turno
          </button>
        )}

      </div>
      </div>
    </div>
  );
}
