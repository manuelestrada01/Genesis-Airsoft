import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./admin.css";

export default function AdminRentalReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [partida, setPartida] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "rentalReservations", id));
        if (!snap.exists()) { setLoading(false); return; }

        const data = { id: snap.id, ...snap.data() };
        setReservation(data);

        // Load partida
        if (data.partidaId) {
          const pSnap = await getDoc(doc(db, "partidas", data.partidaId));
          if (pSnap.exists()) setPartida({ id: pSnap.id, ...pSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const confirmPayment = async () => {
    if (!window.confirm("¿Confirmar el pago de esta reserva?")) return;
    setConfirming(true);
    try {
      await updateDoc(doc(db, "rentalReservations", id), {
        status: "confirmed",
        confirmedAt: serverTimestamp(),
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setReservation((prev) => ({ ...prev, status: "confirmed" }));
      alert("Pago confirmado. Se envió email de confirmación al cliente.");
    } catch (err) {
      console.error(err);
      alert("Error al confirmar el pago");
    } finally {
      setConfirming(false);
    }
  };

  const cancelReservation = async () => {
    if (!window.confirm("¿Cancelar esta reserva? Se liberará el cupo.")) return;
    try {
      await updateDoc(doc(db, "rentalReservations", id), {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });

      // Decrement slot
      if (reservation.partidaId && (reservation.status === "pending_payment" || reservation.status === "confirmed")) {
        await updateDoc(doc(db, "partidas", reservation.partidaId), {
          slotsReserved: increment(-1),
          updatedAt: serverTimestamp(),
        });
      }

      setReservation((prev) => ({ ...prev, status: "cancelled" }));
    } catch (err) {
      console.error(err);
      alert("Error al cancelar");
    }
  };

  if (loading) return <div className="admin-content" style={{ paddingTop: 220 }}><p>Cargando...</p></div>;
  if (!reservation) return <div className="admin-content" style={{ paddingTop: 220 }}><p>Reserva no encontrada</p></div>;

  const r = reservation;
  const p = partida;
  const pricing = r.pricing || {};

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });
  };

  const statusColors = {
    pending_payment: "#d97706",
    confirmed: "#16a34a",
    expired: "#dc2626",
    cancelled: "#6b7280",
  };
  const statusLabels = {
    pending_payment: "PENDIENTE PAGO",
    confirmed: "CONFIRMADA",
    expired: "EXPIRADA",
    cancelled: "CANCELADA",
  };

  const card = {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 6px 22px rgba(0,0,0,0.4)",
  };
  const sectionTitle = { margin: 0, fontSize: 14, fontWeight: 900, color: "#fff", textTransform: "uppercase", letterSpacing: 0.6 };
  const row = { display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid #222" };
  const label = { color: "#888", fontWeight: 700, fontSize: 13 };
  const value = { color: "#fff", fontWeight: 700, fontSize: 13, textAlign: "right" };
  const money = (n) => `$${Number(n || 0).toLocaleString("es-AR")}`;

  return (
    <div className="admin-content" style={{ background: "var(--bg, #0f0f0f)", paddingTop: 220 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: "#fff" }}>
            Reserva <span style={{ color: "#888" }}>#{r.id}</span>
          </h1>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{
              padding: "6px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12,
              color: "#fff", background: statusColors[r.status] || "#555",
            }}>
              {statusLabels[r.status] || r.status?.toUpperCase()}
            </span>
            <span style={{ color: "#888", fontWeight: 700, fontSize: 13 }}>
              Creada: <span style={{ color: "#fff" }}>{formatDate(r.createdAt)}</span>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {r.status === "pending_payment" && (
            <button
              onClick={confirmPayment}
              disabled={confirming}
              style={{
                padding: "10px 14px", borderRadius: 10, border: "none",
                background: "#c8f400", color: "#000", fontWeight: 900, fontSize: 13,
                cursor: confirming ? "not-allowed" : "pointer", opacity: confirming ? 0.5 : 1,
              }}
            >
              {confirming ? "Confirmando..." : "Confirmar Pago"}
            </button>
          )}
          {(r.status === "pending_payment" || r.status === "confirmed") && (
            <button
              onClick={cancelReservation}
              style={{
                padding: "10px 14px", borderRadius: 10, border: "1px solid #dc2626",
                background: "transparent", color: "#dc2626", fontWeight: 900, fontSize: 13, cursor: "pointer",
              }}
            >
              Cancelar Reserva
            </button>
          )}
          <button
            onClick={() => navigate("/admin/alquileres")}
            style={{
              padding: "10px 14px", borderRadius: 10, border: "1px solid #333",
              background: "transparent", color: "#fff", fontWeight: 900, fontSize: 13, cursor: "pointer",
            }}
          >
            Volver
          </button>
        </div>
      </div>

      <div style={{ height: 16 }} />

      {/* Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, alignItems: "start" }}>
        {/* Left */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Cliente */}
          <div style={card}>
            <h3 style={sectionTitle}>Cliente</h3>
            <div style={{ marginTop: 12 }}>
              <div style={row}><div style={label}>Nombre</div><div style={value}>{r.user?.name || "—"}</div></div>
              <div style={row}><div style={label}>Email</div><div style={value}>{r.user?.email || "—"}</div></div>
              <div style={row}><div style={label}>Teléfono</div><div style={value}>{r.user?.phone || "—"}</div></div>
              <div style={row}><div style={label}>DNI</div><div style={value}>{r.user?.dni || "—"}</div></div>
            </div>
          </div>

          {/* Partida */}
          {p && (
            <div style={card}>
              <h3 style={sectionTitle}>Partida</h3>
              <div style={{ marginTop: 12 }}>
                <div style={row}><div style={label}>Lugar</div><div style={value}>{p.lugar}</div></div>
                {p.direccion && <div style={row}><div style={label}>Dirección</div><div style={value}>{p.direccion}</div></div>}
                <div style={row}><div style={label}>Fecha</div><div style={value}>{formatDate(p.horario)}</div></div>
                <div style={row}><div style={label}>Modalidad</div><div style={value}>{p.modalidad}</div></div>
                <div style={row}><div style={label}>Cupos</div><div style={value}>{p.slotsReserved || 0} / {p.slotsTotal || 0}</div></div>
              </div>
              {p.mapImageUrl && (
                <div style={{ marginTop: 12 }}>
                  <img src={p.mapImageUrl} alt="Mapa" style={{ width: "100%", borderRadius: 10, border: "1px solid #2a2a2a" }} />
                </div>
              )}
            </div>
          )}

          {/* Extras */}
          <div style={card}>
            <h3 style={sectionTitle}>Extras seleccionados</h3>
            <div style={{ marginTop: 12 }}>
              {(r.extras || []).length === 0 ? (
                <p style={{ color: "#888", margin: 0 }}>Sin extras</p>
              ) : (
                r.extras.map((e, i) => (
                  <div key={i} style={row}>
                    <div style={label}>{e.name}</div>
                    <div style={value}>{money(e.price)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Pricing */}
          <div style={card}>
            <h3 style={sectionTitle}>Montos</h3>
            <div style={{ marginTop: 12 }}>
              <div style={row}><div style={label}>Alquiler base</div><div style={value}>{money(pricing.basePrice)}</div></div>
              <div style={row}><div style={label}>Extras</div><div style={value}>{money(pricing.extrasTotal)}</div></div>
              <div style={row}><div style={label}>Total completo</div><div style={value}>{money(pricing.totalFull)}</div></div>
              <div style={{ ...row, borderBottom: "none" }}>
                <div style={{ ...label, color: "#c8f400", fontSize: 14 }}>Seña (50%)</div>
                <div style={{ ...value, color: "#c8f400", fontSize: 16 }}>{money(pricing.deposit)}</div>
              </div>
              <div style={row}>
                <div style={label}>Restante día partida</div>
                <div style={value}>{money(pricing.remainingOnDay)}</div>
              </div>
            </div>
          </div>

          {/* Tiempos */}
          <div style={card}>
            <h3 style={sectionTitle}>Tiempos</h3>
            <div style={{ marginTop: 12 }}>
              <div style={row}><div style={label}>Creada</div><div style={value}>{formatDate(r.createdAt)}</div></div>
              <div style={row}><div style={label}>Expira</div><div style={value}>{formatDate(r.expiresAt)}</div></div>
              {r.paidAt && <div style={row}><div style={label}>Pagada</div><div style={value}>{formatDate(r.paidAt)}</div></div>}
              {r.confirmedAt && <div style={row}><div style={label}>Confirmada</div><div style={value}>{formatDate(r.confirmedAt)}</div></div>}
            </div>
          </div>

          {/* Comprobante */}
          <div style={card}>
            <h3 style={sectionTitle}>Comprobante de pago</h3>
            <div style={{ marginTop: 12 }}>
              {r.comprobanteUrl ? (
                <div>
                  <a
                    href={r.comprobanteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", marginBottom: 10 }}
                  >
                    <img
                      src={r.comprobanteUrl}
                      alt="Comprobante"
                      style={{ width: "100%", borderRadius: 10, border: "1px solid #2a2a2a", maxHeight: 400, objectFit: "contain" }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    <span style={{ color: "#c8f400", fontWeight: 800, fontSize: 13 }}>Ver/descargar comprobante →</span>
                  </a>
                  {r.comprobanteAt && (
                    <p style={{ color: "#888", fontSize: 12, fontWeight: 700, margin: 0 }}>
                      Subido: {formatDate(r.comprobanteAt)}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color: "#888", margin: 0, fontWeight: 700, fontSize: 13 }}>
                  El cliente aún no subió el comprobante.
                </p>
              )}
            </div>
          </div>

          {/* Marcadora */}
          {r.status === "confirmed" && (
            <div style={card}>
              <h3 style={sectionTitle}>Marcadora asignada</h3>
              <div style={{ marginTop: 12, color: "#888", fontWeight: 700 }}>
                {r.marcadoraNumber ? `Marcadora N° ${r.marcadoraNumber}` : "Sin asignar (se asigna el día de la partida)"}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .admin-content > div:last-of-type { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
