import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../firebase/config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import AuthContext from "../../context/AuthContext";
import RentalContract from "./RentalContract";
import ConfirmDialog from "../ui/ConfirmDialog";
import "./ReservationStatus.css";

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

  // Realtime listener on reservation
  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, "rentalReservations", id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setReservation(data);

        // Load partida once
        if (data.partidaId && !partida) {
          getDoc(doc(db, "partidas", data.partidaId)).then((pSnap) => {
            if (pSnap.exists()) setPartida({ id: pSnap.id, ...pSnap.data() });
          });
        }
      }
      setLoading(false);
    });

    // Load config
    getDoc(doc(db, "rentalConfig", "default")).then((snap) => {
      if (snap.exists()) setConfig(snap.data());
    });

    return () => unsub();
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!reservation || reservation.status !== "pending_payment") return;

    const expiresAt = reservation.expiresAt?.toDate
      ? reservation.expiresAt.toDate()
      : new Date(reservation.expiresAt);

    const tick = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("00:00");
        return;
      }
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

    if (!user) {
      setUploadError("Necesitás estar logueado para subir el comprobante.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
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
      // Force token refresh to ensure Storage receives valid auth
      await user.getIdToken(true);

      const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
      const ts = Date.now();
      const path = `rentalReservations/${id}/${user.uid}/${ts}-${safeName}`;
      const sRef = ref(storage, path);

      const url = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(sRef, file, { contentType: file.type });
        task.on("state_changed", null, reject, () => {
          getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
        });
      });

      await updateDoc(doc(db, "rentalReservations", id), {
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

  const handleCancelReservation = async () => {
    setCancelError("");
    setCancelling(true);
    try {
      const token = await user.getIdToken();
      const resp = await fetch(
        "https://us-central1-genesis-airsoft.cloudfunctions.net/cancelRentalReservation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reservationId: id }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Error al cancelar");
      // onSnapshot will update the UI automatically
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
    : partida?.horario
    ? new Date(partida.horario)
    : null;

  const statusConfig = {
    pending_payment: { label: "Pendiente de pago", color: "#c8f400", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 2h14M5 22h14M6 2v4l6 6-6 6v4M18 2v4l-6 6 6 6v4"/>
      </svg>
    )},
    pending_approval: { label: "Esperando aprobación", color: "#c8f400", icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 2h14M5 22h14M6 2v4l6 6-6 6v4M18 2v4l-6 6 6 6v4"/>
      </svg>
    )},
    confirmed: { label: "Confirmada", color: "#c8f400", icon: "✓" },
    expired: { label: "Expirada", color: "#dc2626", icon: "✕" },
    cancelled: { label: "Cancelada", color: "#6b7280", icon: "✕" },
  };
  const effectiveStatus = r.status === "pending_payment" && r.comprobanteUrl ? "pending_approval" : r.status;
  const st = statusConfig[effectiveStatus] || statusConfig.pending_payment;

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
      <button className="rs-back" onClick={() => navigate("/alquileres")}>
        ← Volver a partidas
      </button>

      {/* Status header */}
      <div className="rs-status-card" style={{ borderColor: st.color }}>
        <div className="rs-status-icon" style={{ background: st.color, color: st.color === "#c8f400" ? "#000" : "#fff" }}>{st.icon}</div>
        <div>
          <h2 className="rs-status-label" style={{ color: st.color }}>{st.label}</h2>
          <p className="rs-status-id">Reserva #{r.id}</p>
        </div>
      </div>

      {/* Countdown for pending */}
      {r.status === "pending_payment" && (
        <div className="rs-countdown-card">
          <div className="rs-countdown-timer">{countdown}</div>
          <p className="rs-countdown-text">Tiempo restante para transferir</p>

          <div className="rs-transfer-info">
            <h4>Datos de transferencia</h4>
            <div className="rs-transfer-row">
              <span>Alias:</span>
              <span className="rs-transfer-val">{config?.transferAlias || "—"}</span>
            </div>
            <div className="rs-transfer-row">
              <span>CVU:</span>
              <span className="rs-transfer-val">{config?.transferCVU || "—"}</span>
            </div>
            <div className="rs-transfer-row">
              <span>Titular:</span>
              <span className="rs-transfer-val">{config?.transferHolder || "—"}</span>
            </div>
            <div className="rs-transfer-row rs-transfer-row--highlight">
              <span>Monto seña:</span>
              <span className="rs-transfer-val">${Number(pricing.deposit || 0).toLocaleString("es-AR")}</span>
            </div>
          </div>

          {/* Comprobante upload */}
          <div className="rs-comprobante">
            {!r.comprobanteUrl && !r.comprobanteRejected && <h4>Subir comprobante de transferencia</h4>}
            {r.comprobanteRejected && !r.comprobanteUrl && (
              <div className="rs-comprobante-rejected">
                <span className="rs-comprobante-rejected-icon">✕</span>
                <div>
                  <strong>Comprobante rechazado</strong>
                  {r.comprobanteRejectionReason && (
                    <p className="rs-comprobante-rejected-reason">Motivo: {r.comprobanteRejectionReason}</p>
                  )}
                  <p className="rs-comprobante-rejected-hint">Subí un nuevo comprobante para continuar.</p>
                </div>
              </div>
            )}
            {r.comprobanteUrl ? (
              <div className="rs-comprobante-done">
                <span className="rs-comprobante-check">✓</span>
                <span>Comprobante enviado. El admin confirmará el pago en breve.</span>
                <a href={r.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="rs-comprobante-link">
                  Ver comprobante
                </a>
                <label className="rs-comprobante-label rs-comprobante-label--change">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="rs-comprobante-input"
                    onChange={handleComprobanteUpload}
                    disabled={uploadingComprobante}
                  />
                  <span className="rs-comprobante-btn rs-comprobante-btn--change">
                    {uploadingComprobante ? "Subiendo..." : "Cambiar comprobante"}
                  </span>
                </label>
                {uploadError && <p className="rs-comprobante-error">{uploadError}</p>}
              </div>
            ) : (
              <>
                {!r.comprobanteRejected && (
                  <p className="rs-comprobante-hint">
                    Una vez realizada la transferencia, subí la captura o PDF del comprobante para agilizar la confirmación.
                  </p>
                )}
                <label className="rs-comprobante-label">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="rs-comprobante-input"
                    onChange={handleComprobanteUpload}
                    disabled={uploadingComprobante}
                  />
                  <span className="rs-comprobante-btn">
                    {uploadingComprobante ? "Subiendo..." : "Seleccionar archivo"}
                  </span>
                </label>
                {uploadError && <p className="rs-comprobante-error">{uploadError}</p>}
              </>
            )}
          </div>

          {/* Cancel button */}
          <div className="rs-cancel-section">
            <button
              className="rs-cancel-btn"
              onClick={() => setCancelDialog(true)}
              disabled={cancelling}
            >
              {cancelling ? "Cancelando..." : "Cancelar reserva"}
            </button>
            {cancelError && <p className="rs-comprobante-error">{cancelError}</p>}
          </div>
        </div>
      )}

      {/* Confirmed details */}
      {r.status === "confirmed" && (
        <div className="rs-confirmed-card">
          <p>Tu alquiler está confirmado. Te esperamos en la partida.</p>

          {partida && (
            <div className="rs-partida-info">
              <div className="rs-info-row"><span>Lugar:</span><span>{partida.lugar}</span></div>
              {partida.direccion && <div className="rs-info-row"><span>Dirección:</span><span>{partida.direccion}</span></div>}
              {horario && (
                <div className="rs-info-row">
                  <span>Fecha:</span>
                  <span>{horario.toLocaleDateString("es-AR", { dateStyle: "long" })} — {horario.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs</span>
                </div>
              )}
              <div className="rs-info-row"><span>Modalidad:</span><span>{partida.modalidad}</span></div>
            </div>
          )}

          <div className="rs-reminder">
            <h4>Recordá</h4>
            <ul>
              <li>No olvides traer el DNI</li>
              <li>Recordá llegar temprano</li>
            </ul>
          </div>

          <RentalContract reservation={r} partida={partida} />
        </div>
      )}

      {/* Expired */}
      {r.status === "expired" && (
        <div className="rs-expired-card">
          <p>Tu reserva expiró porque no se confirmó el pago a tiempo.</p>
          <button className="rs-cta" onClick={() => navigate("/alquileres")}>
            Ver partidas disponibles
          </button>
        </div>
      )}

      {/* Pricing summary */}
      <div className="rs-pricing">
        <h3>Detalle del alquiler</h3>

        {/* Base price */}
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

        {/* Extras */}
        {(r.extras || []).length > 0 && (
          <>
            <div className="rs-price-divider" />
            <p className="rs-price-label">Extras (se pagan el día de la partida)</p>
            {(r.extras || []).map((e, i) => (
              <div key={i} className="rs-price-row rs-price-row--sub">
                <span>{e.name}</span>
                <span>${Number(e.price || 0).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </>
        )}

        {/* Totals */}
        <div className="rs-price-divider" />
        <div className="rs-price-row rs-price-row--total">
          <span>Total completo</span>
          <span>${Number(pricing.totalFull || 0).toLocaleString("es-AR")}</span>
        </div>
        <div className="rs-price-row rs-price-row--deposit">
          <span>Seña abonada</span>
          <span>${Number(pricing.deposit || 0).toLocaleString("es-AR")}</span>
        </div>
        <div className="rs-price-row rs-price-row--remaining">
          <span>Saldo restante (día de partida)</span>
          <span>${Number(pricing.remainingOnDay || 0).toLocaleString("es-AR")}</span>
        </div>
      </div>
    </div>
  );
}
