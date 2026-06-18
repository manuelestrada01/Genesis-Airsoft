import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";

const DEFAULT_CONFIG = {
  basePrice: 24000,
  defaultSlots: 5,
  depositPercent: 50,
  expirationMinutes: 30,
  transferAlias: "",
  transferCVU: "",
  transferHolder: "",
  extras: [
    { id: "chaleco", name: "Chaleco táctico", price: 3800 },
    { id: "mascara", name: "Máscara facial", price: 3000 },
    { id: "cargador_extra", name: "Cargador extra con recarga mid/high", price: 6000 },
    { id: "bbs", name: "Recarga de BBs (300bbs)", price: 3700 },
    { id: "resorte", name: "Cambio de resorte Asalto M120", price: 1500 },
  ],
};

export default function AdminRentalConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "rentalConfig", "default"));
        if (snap.exists()) {
          setConfig({ ...DEFAULT_CONFIG, ...snap.data() });
        }
      } catch (err) {
        console.error("Error cargando config:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleExtraChange = (index, field, value) => {
    setConfig((prev) => {
      const extras = [...prev.extras];
      extras[index] = { ...extras[index], [field]: field === "price" ? Number(value) : value };
      return { ...prev, extras };
    });
  };

  const addExtra = () => {
    const id = `extra_${Date.now()}`;
    setConfig((prev) => ({
      ...prev,
      extras: [...prev.extras, { id, name: "", price: 0 }],
    }));
  };

  const removeExtra = (index) => {
    setConfig((prev) => ({
      ...prev,
      extras: prev.extras.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await setDoc(doc(db, "rentalConfig", "default"), {
        ...config,
        basePrice: Number(config.basePrice),
        defaultSlots: Number(config.defaultSlots),
        depositPercent: Number(config.depositPercent),
        expirationMinutes: Number(config.expirationMinutes),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setMessage("Configuración guardada correctamente");
    } catch (err) {
      console.error("Error guardando config:", err);
      setMessage("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-container"><AdminSidebar /><div className="admin-content"><p>Cargando...</p></div></div>;

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div className="af-header">
          <h1 className="af-page-title">Configuración de Alquileres</h1>
        </div>

        <form className="af-form" onSubmit={(e) => e.preventDefault()}>
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Precio base del alquiler ($)</label>
              <input
                className="af-input"
                type="number"
                value={config.basePrice}
                onChange={(e) => handleChange("basePrice", e.target.value)}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Cupos por defecto</label>
              <input
                className="af-input"
                type="number"
                value={config.defaultSlots}
                onChange={(e) => handleChange("defaultSlots", e.target.value)}
              />
            </div>
          </div>

          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Porcentaje de seña (%)</label>
              <input
                className="af-input"
                type="number"
                min="1"
                max="100"
                value={config.depositPercent}
                onChange={(e) => handleChange("depositPercent", e.target.value)}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Tiempo de expiración (minutos)</label>
              <input
                className="af-input"
                type="number"
                value={config.expirationMinutes}
                onChange={(e) => handleChange("expirationMinutes", e.target.value)}
              />
            </div>
          </div>

          <hr className="af-divider" />
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>Datos de transferencia</h2>

          <div className="af-field">
            <label className="af-label">Alias</label>
            <input
              className="af-input"
              value={config.transferAlias}
              onChange={(e) => handleChange("transferAlias", e.target.value)}
            />
          </div>
          <div className="af-field">
            <label className="af-label">CVU / CBU</label>
            <input
              className="af-input"
              value={config.transferCVU}
              onChange={(e) => handleChange("transferCVU", e.target.value)}
            />
          </div>
          <div className="af-field">
            <label className="af-label">Titular</label>
            <input
              className="af-input"
              value={config.transferHolder}
              onChange={(e) => handleChange("transferHolder", e.target.value)}
            />
          </div>

          <hr className="af-divider" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>Extras disponibles</h2>
            <button
              type="button"
              className="af-save-btn"
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={addExtra}
            >
              + Agregar extra
            </button>
          </div>

          {config.extras.map((extra, i) => (
            <div key={extra.id} className="af-row" style={{ alignItems: "flex-end" }}>
              <div className="af-field" style={{ flex: 2 }}>
                <label className="af-label">Nombre</label>
                <input
                  className="af-input"
                  value={extra.name}
                  onChange={(e) => handleExtraChange(i, "name", e.target.value)}
                />
              </div>
              <div className="af-field" style={{ flex: 1 }}>
                <label className="af-label">Precio ($)</label>
                <input
                  className="af-input"
                  type="number"
                  value={extra.price}
                  onChange={(e) => handleExtraChange(i, "price", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeExtra(i)}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 800,
                  marginBottom: 4,
                }}
              >
                Eliminar
              </button>
            </div>
          ))}

          <div className="af-actions">
            <button
              className="af-save-btn"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar Configuración"}
            </button>
            {message && (
              <p className={`af-msg ${message.includes("Error") ? "af-msg--error" : "af-msg--success"}`}>
                {message}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
