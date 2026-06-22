import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../../firebase/config";
import AuthContext from "../../context/AuthContext";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";

const FUNCTION_URL = "https://us-central1-genesis-airsoft.cloudfunctions.net/createManualReservation";

export default function AdminAddReservation() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [partidas, setPartidas] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    partidaId: "",
    name: "",
    email: "",
    phone: "",
    dni: "",
    status: "confirmed",
    marcadoraNumber: "",
    notes: "",
    discountOverride: "",
  });
  const [selectedExtras, setSelectedExtras] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [cSnap, pSnap] = await Promise.all([
          getDoc(doc(db, "rentalConfig", "default")),
          getDocs(collection(db, "partidas")),
        ]);

        if (cSnap.exists()) setConfig(cSnap.data());

        const list = pSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.status === "active")
          .sort((a, b) => {
            const da = a.horario?.toDate ? a.horario.toDate() : new Date(a.horario);
            const db2 = b.horario?.toDate ? b.horario.toDate() : new Date(b.horario);
            return da - db2;
          });
        setPartidas(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleExtra = (id) => {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Derived pricing
  const selectedPartida = partidas.find((p) => p.id === form.partidaId);
  const basePrice = config?.basePrice || 24000;
  const depositPercent = config?.depositPercent || 50;
  const allExtras = config?.extras || [];
  const chosenExtras = allExtras.filter((e) => selectedExtras.includes(e.id));
  const extrasTotal = chosenExtras.reduce((sum, e) => sum + Number(e.price), 0);

  const rawDiscount =
    form.discountOverride !== ""
      ? Number(form.discountOverride)
      : Number(selectedPartida?.discountPercent) || 0;
  const discountPct = Math.min(Math.max(rawDiscount, 0), 100);
  const discountedBase = discountPct > 0 ? Math.round(basePrice * (1 - discountPct / 100)) : basePrice;
  const totalFull = discountedBase + extrasTotal;
  const deposit = Math.round(discountedBase * (depositPercent / 100));
  const remainingOnDay = totalFull - deposit;

  const handleSave = async () => {
    setMessage("");

    if (!form.partidaId) return setMessage("Seleccioná una partida.");
    if (!form.name.trim()) return setMessage("El nombre es obligatorio.");
    if (!form.email.trim()) return setMessage("El email es obligatorio.");
    if (!form.phone.trim()) return setMessage("El teléfono es obligatorio.");
    if (!form.dni.trim()) return setMessage("El DNI es obligatorio.");

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          partidaId: form.partidaId,
          user: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            dni: form.dni.trim(),
          },
          extras: selectedExtras,
          status: form.status,
          marcadoraNumber: form.marcadoraNumber || "",
          notes: form.notes.trim(),
          discountOverride: form.discountOverride,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear la reserva");

      navigate(`/admin/alquileres/${data.reservationId}`);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Error al crear la reserva.");
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content"><p>Cargando...</p></div>
    </div>
  );

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div className="af-header">
          <h1 className="af-page-title">Nueva Reserva Manual</h1>
        </div>

        <form className="af-form" onSubmit={(e) => e.preventDefault()}>
          {/* Partida */}
          <div className="af-field">
            <label className="af-label">Partida *</label>
            <select className="af-select" name="partidaId" value={form.partidaId} onChange={handleChange}>
              <option value="">Seleccioná una partida...</option>
              {partidas.map((p) => {
                const d = p.horario?.toDate ? p.horario.toDate() : new Date(p.horario);
                const slots = (p.slotsTotal || 0) - (p.slotsReserved || 0);
                return (
                  <option key={p.id} value={p.id}>
                    {p.lugar} — {d.toLocaleDateString("es-AR", { dateStyle: "medium" })} — {slots} cupos
                  </option>
                );
              })}
            </select>
          </div>

          <hr className="af-divider" />

          {/* Cliente */}
          <div className="af-field">
            <label className="af-label">Nombre completo *</label>
            <input className="af-input" name="name" value={form.name} onChange={handleChange} placeholder="Juan Pérez" />
          </div>

          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Email *</label>
              <input className="af-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="juan@email.com" />
            </div>
            <div className="af-field">
              <label className="af-label">Teléfono *</label>
              <input className="af-input" name="phone" value={form.phone} onChange={handleChange} placeholder="1155551234" />
            </div>
          </div>

          <div className="af-row">
            <div className="af-field">
              <label className="af-label">DNI *</label>
              <input className="af-input" name="dni" value={form.dni} onChange={handleChange} placeholder="12345678" />
            </div>
            <div className="af-field" />
          </div>

          <hr className="af-divider" />

          {/* Extras */}
          {allExtras.length > 0 && (
            <>
              <label className="af-label">Extras</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {allExtras.map((e) => (
                  <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedExtras.includes(e.id)}
                      onChange={() => toggleExtra(e.id)}
                      style={{ width: 18, height: 18, accentColor: "#c8f400" }}
                    />
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{e.name}</span>
                    <span style={{ color: "#888", fontWeight: 700, fontSize: 13, marginLeft: "auto" }}>
                      +${Number(e.price).toLocaleString("es-AR")}
                    </span>
                  </label>
                ))}
              </div>
              <hr className="af-divider" />
            </>
          )}

          {/* Pricing preview */}
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Descuento (%)</label>
              <input
                className="af-input"
                name="discountOverride"
                type="number"
                min="0"
                max="100"
                value={form.discountOverride}
                onChange={handleChange}
                placeholder={`${Number(selectedPartida?.discountPercent) || 0} (de la partida)`}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Número de marcadora</label>
              <input
                className="af-input"
                name="marcadoraNumber"
                type="number"
                min="1"
                value={form.marcadoraNumber}
                onChange={handleChange}
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* Pricing summary box */}
          {form.partidaId && (
            <div style={{
              background: "#111", border: "1px solid #2a2a2a", borderRadius: 12,
              padding: "16px 20px", marginBottom: 20, fontSize: 13, fontWeight: 700,
            }}>
              <p style={{ color: "#888", margin: "0 0 10px", textTransform: "uppercase", fontSize: 12, letterSpacing: 0.5 }}>
                Resumen de precios
              </p>
              {discountPct > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#555", marginBottom: 4 }}>
                  <span>Base original</span>
                  <span style={{ textDecoration: "line-through" }}>${basePrice.toLocaleString("es-AR")}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", marginBottom: 4 }}>
                <span>Alquiler base{discountPct > 0 ? ` (-${discountPct}%)` : ""}</span>
                <span>${discountedBase.toLocaleString("es-AR")}</span>
              </div>
              {chosenExtras.map((e) => (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", color: "#888", marginBottom: 4, paddingLeft: 12 }}>
                  <span>{e.name}</span>
                  <span>+${Number(e.price).toLocaleString("es-AR")}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", color: "#fff", borderTop: "1px solid #2a2a2a", paddingTop: 8, marginTop: 4 }}>
                <span>Total completo</span>
                <span>${totalFull.toLocaleString("es-AR")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#c8f400", marginTop: 4 }}>
                <span>Seña ({depositPercent}%)</span>
                <span>${deposit.toLocaleString("es-AR")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#888", marginTop: 4 }}>
                <span>Saldo día de partida</span>
                <span>${remainingOnDay.toLocaleString("es-AR")}</span>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Estado inicial</label>
              <select className="af-select" name="status" value={form.status} onChange={handleChange}>
                <option value="confirmed">Confirmada (ya pagó)</option>
                <option value="pending_payment">Pendiente de pago</option>
              </select>
            </div>
            <div className="af-field" />
          </div>

          {/* Notes */}
          <div className="af-field">
            <label className="af-label">Notas internas</label>
            <input
              className="af-input"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Reserva por teléfono, pagó en efectivo..."
            />
          </div>

          <div className="af-actions">
            <button className="af-save-btn" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Creando..." : "Crear Reserva"}
            </button>
            <button
              type="button"
              style={{ padding: "12px 24px", background: "transparent", border: "1px solid #333", color: "#fff", borderRadius: 10, cursor: "pointer", fontWeight: 800 }}
              onClick={() => navigate("/admin/alquileres")}
            >
              Cancelar
            </button>
            {message && (
              <p className={`af-msg ${message.includes("Error") || message.includes("obligatorio") || message.includes("Seleccioná") || message.includes("cupos") ? "af-msg--error" : "af-msg--success"}`}>
                {message}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
