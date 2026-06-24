import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import AuthContext from "../../context/AuthContext";
import { generatePresupuestoPDF } from "../../utils/generatePresupuestoPDF";
import ConfirmDialog from "../ui/ConfirmDialog";
import "./ServicioTurnoStatus.css";

const CANCEL_URL = "https://us-central1-genesis-airsoft.cloudfunctions.net/cancelServicioTurno";

const STATUS_CONFIG = {
  pending_approval: { label: "Pendiente de aprobación", color: "#c8f400", bg: "rgba(200,244,0,0.08)" },
  approved: { label: "Aprobado", color: "#c8f400", bg: "rgba(200,244,0,0.08)" },
  payment_review: { label: "Esperando confirmación de pago", color: "#c8f400", bg: "rgba(200,244,0,0.08)" },
  in_progress: { label: "En proceso", color: "#fb923c", bg: "rgba(251,146,60,0.08)" },
  completed: { label: "Completado", color: "#4ade80", bg: "rgba(74,222,128,0.08)" },
  cancelled: { label: "Cancelado", color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
  rejected: { label: "Rechazado", color: "#f87171", bg: "rgba(248,113,113,0.08)" },
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
    if (!validTypes.includes(file.type)) {
      setUploadError("Solo se aceptan imágenes (JPG, PNG, WebP) o PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("El archivo no puede superar los 10MB.");
      return;
    }

    setUploadError("");
    setUploadingComprobante(true);
    try {
      await user.getIdToken(true);
      const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
      const path = `servicioTurnos/${id}/${user.uid}/${Date.now()}-${safeName}`;
      const sRef = ref(storage, path);

      const url = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file, { contentType: file.type });
        task.on("state_changed", null, reject, () => {
          getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
        });
      });

      await updateDoc(doc(db, "servicioTurnos", id), {
        comprobanteUrl: url,
        comprobantePath: path,
        comprobanteAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
    setCancelError("");
    setCancelling(true);
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

  const handleDownloadPDF = () => {
    if (!turno) return;
    generatePresupuestoPDF(turno);
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

      <button className="sts-back" onClick={() => navigate("/servicio")}>
        ← Volver a servicios
      </button>

      {/* Status card */}
      <div className="sts-status-card" style={{ borderColor: st.color, background: st.bg }}>
        <div className="sts-status-badge" style={{ background: st.color, color: st.color === "#c8f400" || st.color === "#4ade80" ? "#000" : "#fff" }}>
          {t.isRedeemed && "⭐ "}
          {st.label}
        </div>
        <p className="sts-turno-id">Turno #{t.id}</p>
        {t.isRedeemed && <p className="sts-redeemed-badge">Canjeado con puntos Genesis</p>}
      </div>

      {/* Service + date summary */}
      <div className="sts-info-card">
        <div className="sts-info-row"><span>Servicio</span><span>{serviceLabel}</span></div>
        <div className="sts-info-row"><span>Fecha turno</span><span>{t.scheduledDate}</span></div>
        <div className="sts-info-row"><span>Réplica</span><span>{t.replica?.marca} {t.replica?.modelo} ({t.replica?.tipo})</span></div>
        {t.serviceType === "tecnico" && t.fallaReportada && (
          <div className="sts-info-row sts-info-row--falla">
            <span>Falla reportada</span>
            <span>{t.fallaReportada}</span>
          </div>
        )}
        {t.addons?.length > 0 && (
          <div className="sts-info-row">
            <span>Mejoras</span>
            <span>{t.addons.map((a) => a.name).join(", ")}</span>
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
            <>
              <div className="sts-payment-card">
                <h3 className="sts-payment-title">Abonár el servicio</h3>
                <p className="sts-payment-subtitle">Tu turno fue aprobado. Realizá la transferencia y subí el comprobante.</p>

                <div className="sts-transfer-info">
                  <div className="sts-transfer-row">
                    <span>Alias</span>
                    <strong>{config?.transferAlias || "—"}</strong>
                  </div>
                  {config?.transferCVU && (
                    <div className="sts-transfer-row">
                      <span>CVU / CBU</span>
                      <strong className="sts-transfer-cvu">{config.transferCVU}</strong>
                    </div>
                  )}
                  {config?.transferHolder && (
                    <div className="sts-transfer-row">
                      <span>Titular</span>
                      <strong>{config.transferHolder}</strong>
                    </div>
                  )}
                  <div className="sts-transfer-row sts-transfer-row--total">
                    <span>Monto a transferir</span>
                    <strong>${Number(pricing.total || 0).toLocaleString("es-AR")}</strong>
                  </div>
                </div>

                <div className="sts-upload-section">
                  <p className="sts-upload-label">Subí el comprobante de transferencia</p>
                  <label className="sts-upload-btn">
                    {uploadingComprobante ? "Subiendo..." : "Seleccionar archivo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ display: "none" }}
                      onChange={handleComprobanteUpload}
                      disabled={uploadingComprobante}
                    />
                  </label>
                  <p className="sts-upload-hint">JPG, PNG, WebP o PDF — máx. 10MB</p>
                  {uploadError && <p className="sts-error">{uploadError}</p>}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {t.status === "approved" && t.isRedeemed && (
        <div className="sts-message sts-message--approved">
          Tu turno fue aprobado. Llevá tu réplica en la fecha indicada.
        </div>
      )}

      {t.status === "in_progress" && (
        <div className="sts-message sts-message--inprogress">
          Tu réplica está siendo atendida por el técnico.
        </div>
      )}

      {t.status === "completed" && (
        <div className="sts-message sts-message--completed">
          Servicio completado.
          {!t.isRedeemed && " Se acreditaron +10 puntos Genesis en tu cuenta."}
        </div>
      )}

      {t.status === "rejected" && t.rejectionReason && (
        <div className="sts-message sts-message--rejected">
          Motivo del rechazo: {t.rejectionReason}
        </div>
      )}

      {/* Planilla / PDF download */}
      {t.status === "completed" && planilla && (
        <div className="sts-planilla-card">
          <h3>Presupuesto / Planilla de servicio</h3>
          <p>N° {planilla.presupuestoNumber} — Técnico: {planilla.tecnico}</p>
          <button className="sts-pdf-btn" onClick={handleDownloadPDF}>
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
            {planilla.descuentoPercent > 0 && (
              <div className="sts-price-row"><span>Descuento</span><span>-{planilla.descuentoPercent}%</span></div>
            )}
            <div className="sts-price-row sts-price-row--total"><span>Total a pagar</span><span>${Number(planilla.totalAPagar || 0).toLocaleString("es-AR")}</span></div>
          </>
        ) : (
          <div className="sts-price-row sts-price-row--estimate"><span>Total estimado</span><span>${Number(pricing.total || 0).toLocaleString("es-AR")}</span></div>
        )}
      </div>

      {/* Cancel button */}
      {t.status === "pending_approval" && (
        <div className="sts-cancel-section">
          <button
            className="sts-cancel-btn"
            onClick={() => setCancelDialog(true)}
            disabled={cancelling}
          >
            {cancelling ? "Cancelando..." : "Cancelar turno"}
          </button>
          {cancelError && <p className="sts-error">{cancelError}</p>}
        </div>
      )}

      {/* Rejected/cancelled CTA */}
      {(t.status === "rejected" || t.status === "cancelled") && (
        <div className="sts-cta-section">
          <button className="sts-cta-btn" onClick={() => navigate("/servicio")}>
            Sacar nuevo turno
          </button>
        </div>
      )}
    </div>
  );
}
