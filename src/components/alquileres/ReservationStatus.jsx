import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import AuthContext from "../../context/AuthContext";
import RentalContract from "./RentalContract";
import ConfirmDialog from "../ui/ConfirmDialog";
import "./ReservationStatus.css";

const STATUS_CONFIG = {
  pending_payment:  { label: "Pendiente de pago",       color: "#c8f400", icon: "card" },
  pending_approval: { label: "Esperando aprobación",    color: "#c8f400", icon: "clock" },
  confirmed:        { label: "Confirmada",               color: "#c8f400", icon: "check" },
  expired:          { label: "Expirada",                 color: "#dc2626", icon: "x" },
  cancelled:        { label: "Cancelada",                color: "#6b7280", icon: "x" },
};

const StatusIcon = ({ type, color }) => {
  const s = { width: 32, height: 32, fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "card")  return <svg viewBox="0 0 24 24" style={s}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
  if (type === "clock") return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  if (type === "check") return <svg viewBox="0 0 24 24" style={s}><polyline points="20 6 9 17 4 12"/></svg>;
  if (type === "x")     return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
  return null;
};

export default function ReservationStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [reservation, setReservation] = useState(null);
  const [partida, setPartida] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelDialog, setCancelDialog] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "rentalReservations", id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setReservation(data);
        if (data.partidaId && !partida) {
          getDoc(doc(db, "partidas", data.partidaId)).then((pSnap) => {
            if (pSnap.exists()) setPartida({ id: pSnap.id, ...pSnap.data() });
          });
        }
      }
      setLoading(false);
    });
    getDoc(doc(db, "rentalConfig", "default")).then((snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!reservation || reservation.status !== "pending_payment") return;
    const expiresAt = reservation.expiresAt?.toDate
      ? reservation.expiresAt.toDate()
      : new Date(reservation.expiresAt);
    const tick = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) { setCountdown("00:00"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reservation]);

  const handleComprobanteUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) { setUploadError("Necesitás estar logueado para subir el comprobante."); return; }
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!validTypes.includes(file.type)) { setUploadError("Solo se aceptan imágenes (JPG, PNG, WebP) o PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("El archivo no puede superar los 10MB."); return; }
    setUploadError(""); setUploadingComprobante(true);
    try {
      await user.getIdToken(true);
      const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
      const path = `rentalReservations/${id}/${user.uid}/${Date.now()}-${safeName}`;
      const sRef = ref(storage, path);
      const url = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file, { contentType: file.type });
        task.on("state_changed", null, reject, () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject));
      });
      await updateDoc(doc(db, "rentalReservations", id), {
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

  const handleCancelReservation = async () => {
    setCancelError(""); setCancelling(true);
    try {
      const token = await user.getIdToken();
      const resp = await fetch(
        "https://us-central1-genesis-airsoft.cloudfunctions.net/cancelRentalReservation",
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ reservationId: id }) }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Error al cancelar");
    } catch (err) {
      console.error("Error cancelando reserva:", err);
      setCancelError(err.message || "Error al cancelar. Intentá de nuevo.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="rs-page"><p className="rs-loading">Cargando...</p></div>;
  if (!reservation) return <div className="rs-page"><p className="rs-loading">Reserva no encontrada</p></div>;

  const r = reservation;
  const pricing = r.pricing || {};
  const horario = partida?.horario?.toDate
    ? partida.horario.toDate()
    : partida?.horario ? new Date(partida.horario) : null;

  const effectiveStatus = r.status === "pending_payment" && r.comprobanteUrl ? "pending_approval" : r.status;
  const st = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending_payment;

  return (
    <div className="rs-page">
      <ConfirmDialog
        isOpen={cancelDialog}
        title="Cancelar reserva"
        message="¿Cancelar esta reserva? Esta acción no se puede deshacer."
        confirmLabel="Cancelar reserva"
        danger
        onConfirm={() => { setCancelDialog(false); handleCancelReservation(); }}
        onCancel={() => setCancelDialog(false)}
      />

      <div className="rs-wrapper">
        <button className="rs-back" onClick={() => navigate("/profile")}>
          ← Volver a mis partidas
        </button>

        <div className="rs-card">

          {/* Animated status icon */}
          <div className="rs-icon-wrap">
            <div className="rs-icon-ring" style={{ borderColor: st.color, boxShadow: `0 0 20px ${st.color}44` }} />
            <div className="rs-icon-inner"><StatusIcon type={st.icon} color={st.color} /></div>
          </div>

          {/* Hero */}
          <div className="rs-hero">
            <h1 className="rs-hero-title" style={{ color: st.color }}>{st.label}</h1>
            <p className="rs-hero-id">Reserva #{r.id}</p>
          </div>

          {/* Partida info rows */}
          {partida && (
            <div className="rs-details">
              <div className="rs-detail-row"><span>Partida</span><span>{partida.lugar}</span></div>
              {partida.direccion && <div className="rs-detail-row"><span>Dirección</span><span>{partida.direccion}</span></div>}
              {horario && (
                <div className="rs-detail-row">
                  <span>Fecha</span>
                  <span>{horario.toLocaleDateString("es-AR", { dateStyle: "long" })} — {horario.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs</span>
                </div>
              )}
              {partida.modalidad && <div className="rs-detail-row"><span>Modalidad</span><span>{partida.modalidad}</span></div>}
            </div>
          )}

          {/* Pending payment: countdown + transfer + upload */}
          {r.status === "pending_payment" && (
            <div className="rs-payment-block">
              <div className="rs-countdown-wrap">
                <div className="rs-countdown-timer">{countdown}</div>
                <p className="rs-countdown-text">Tiempo restante para transferir</p>
              </div>

              <div className="rs-transfer-info">
                <div className="rs-transfer-row"><span>Alias</span><strong>{config?.transferAlias || "—"}</strong></div>
                {config?.transferCVU && <div className="rs-transfer-row"><span>CVU / CBU</span><strong className="rs-transfer-cvu">{config.transferCVU}</strong></div>}
                {config?.transferHolder && <div className="rs-transfer-row"><span>Titular</span><strong>{config.transferHolder}</strong></div>}
                <div className="rs-transfer-row rs-transfer-row--total">
                  <span>Monto seña</span>
                  <strong>${Number(pricing.deposit || 0).toLocaleString("es-AR")}</strong>
                </div>
              </div>

              <div className="rs-upload-section">
                {r.comprobanteRejected && !r.comprobanteUrl && (
                  <div className="rs-comprobante-rejected">
                    <div className="rs-rejected-icon">✕</div>
                    <div>
                      <strong>Comprobante rechazado</strong>
                      {r.comprobanteRejectionReason && <p className="rs-rejected-reason">Motivo: {r.comprobanteRejectionReason}</p>}
                      <p className="rs-rejected-hint">Subí un nuevo comprobante para continuar.</p>
                    </div>
                  </div>
                )}
                {r.comprobanteUrl ? (
                  <div className="rs-comprobante-done">
                    <span className="rs-comprobante-check">✓</span>
                    <span>Comprobante enviado. El admin confirmará el pago en breve.</span>
                    <a href={r.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="rs-comprobante-link">Ver comprobante ↗</a>
                    <label className="rs-upload-btn rs-upload-btn--change">
                      <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleComprobanteUpload} disabled={uploadingComprobante} />
                      {uploadingComprobante ? "Subiendo..." : "Cambiar comprobante"}
                    </label>
                    {uploadError && <p className="rs-error">{uploadError}</p>}
                  </div>
                ) : (
                  <>
                    {!r.comprobanteRejected && <p className="rs-upload-hint">Una vez realizada la transferencia, subí la captura o PDF del comprobante.</p>}
                    <label className="rs-upload-btn" style={{ opacity: uploadingComprobante ? 0.6 : 1, pointerEvents: uploadingComprobante ? "none" : "auto" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      {uploadingComprobante ? "Subiendo..." : "Seleccionar archivo"}
                      <input type="file" accept="image/*,application/pdf" style={{ position: "absolute", width: 0, height: 0, opacity: 0, overflow: "hidden" }} onChange={handleComprobanteUpload} disabled={uploadingComprobante} />
                    </label>
                    <p className="rs-upload-fmt">JPG, PNG, WebP, GIF o PDF — máx. 10MB</p>
                    {uploadError && <p className="rs-error">{uploadError}</p>}
                  </>
                )}
              </div>

            </div>
          )}

          {/* Pending approval */}
          {effectiveStatus === "pending_approval" && (
            <div className="rs-message rs-message--pending">
              Comprobante recibido. Estamos confirmando el pago, te avisamos por email.
            </div>
          )}

          {/* Confirmed */}
          {r.status === "confirmed" && (
            <>
              <div className="rs-message rs-message--confirmed">
                Tu alquiler está confirmado. ¡Te esperamos en la partida!
              </div>
              <div className="rs-reminder">
                <h4>Recordá llevar</h4>
                <ul>
                  <li>DNI</li>
                  <li>Llegar temprano</li>
                </ul>
              </div>
              <RentalContract reservation={r} partida={partida} />
            </>
          )}

          {/* Expired */}
          {r.status === "expired" && (
            <div className="rs-message rs-message--expired">
              Tu reserva expiró porque no se confirmó el pago a tiempo.
            </div>
          )}

          {/* Pricing */}
          <div className="rs-pricing">
            <h3>Detalle del alquiler</h3>
            <div className="rs-price-row">
              <span>Alquiler base</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {pricing.originalBasePrice && (
                  <span style={{ color: "#555", fontSize: 13, fontWeight: 700, textDecoration: "line-through" }}>
                    ${Number(pricing.originalBasePrice).toLocaleString("es-AR")}
                  </span>
                )}
                ${Number(pricing.basePrice || 0).toLocaleString("es-AR")}
                {pricing.discountPercent > 0 && (
                  <span style={{ background: "var(--accent, #c8f400)", color: "#000", fontSize: 11, fontWeight: 900, padding: "2px 7px", borderRadius: 999 }}>
                    -{pricing.discountPercent}%
                  </span>
                )}
              </span>
            </div>
            {(r.extras || []).length > 0 && (
              <>
                <div className="rs-price-divider" />
                <p className="rs-price-label">Extras (se pagan el día de la partida)</p>
                {(r.extras || []).map((e, i) => (
                  <div key={i} className="rs-price-row rs-price-row--sub"><span>{e.name}</span><span>${Number(e.price || 0).toLocaleString("es-AR")}</span></div>
                ))}
              </>
            )}
            <div className="rs-price-divider" />
            <div className="rs-price-row rs-price-row--total"><span>Total completo</span><span>${Number(pricing.totalFull || 0).toLocaleString("es-AR")}</span></div>
            <div className="rs-price-row rs-price-row--deposit"><span>Seña abonada</span><span>${Number(pricing.deposit || 0).toLocaleString("es-AR")}</span></div>
            <div className="rs-price-row rs-price-row--remaining"><span>Saldo restante (día de partida)</span><span>${Number(pricing.remainingOnDay || 0).toLocaleString("es-AR")}</span></div>
          </div>

          {/* Cancel — always at bottom */}
          {r.status === "pending_payment" && (
            <div className="rs-cancel-section">
              <button className="rs-cancel-btn" onClick={() => setCancelDialog(true)} disabled={cancelling}>
                {cancelling ? "Cancelando..." : "Cancelar reserva"}
              </button>
              {cancelError && <p className="rs-error">{cancelError}</p>}
            </div>
          )}

          {/* CTA expired/cancelled */}
          {(r.status === "expired" || r.status === "cancelled") && (
            <button className="rs-cta-btn" onClick={() => navigate("/alquileres")}>
              Ver partidas disponibles
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
