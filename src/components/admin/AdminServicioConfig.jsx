import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, getDocs, collection, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";

const DEFAULT_CONFIG = {
  diagnosticFee: 17000,
  maintenance: {
    primaria_comun: 25000,
    primaria_plus: 28000,
    secundaria_comun: 18000,
    secundaria_plus: 20000,
  },
  addons: [
    { id: "bucking_4uantum", name: "4UANTUM Friction Pro – High Performance Bucking", price: 0 },
    { id: "spring_m120", name: "Arcturus Spring M120", price: 0 },
    { id: "spring_m100", name: "Arcturus Spring M100", price: 0 },
  ],
  validezDias: 15,
  defaultSlotsPerDay: 5,
  presupuestoPrefix: "AG",
  nextPresupuestoNumber: 1,
  transferAlias: "",
  transferCVU: "",
  transferHolder: "",
  locations: [{ name: "", address: "", mapsUrl: "" }],
};

export default function AdminServicioConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "servicioConfig", "default"));
        if (snap.exists()) {
          setConfig({ ...DEFAULT_CONFIG, ...snap.data() });
        }
      } catch (err) {
        console.error("Error cargando config servicio:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleMaintenanceChange = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      maintenance: { ...prev.maintenance, [key]: Number(value) },
    }));
  };

  const handleAddonChange = (index, field, value) => {
    setConfig((prev) => {
      const addons = [...prev.addons];
      addons[index] = { ...addons[index], [field]: field === "price" ? Number(value) : value };
      return { ...prev, addons };
    });
  };

  const addAddon = () => {
    const id = `addon_${Date.now()}`;
    setConfig((prev) => ({
      ...prev,
      addons: [...prev.addons, { id, name: "", price: 0 }],
    }));
  };

  const removeAddon = (index) => {
    setConfig((prev) => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const newSlotsPerDay = Number(config.defaultSlotsPerDay);

      await setDoc(doc(db, "servicioConfig", "default"), {
        ...config,
        diagnosticFee: Number(config.diagnosticFee),
        defaultSlotsPerDay: newSlotsPerDay,
        validezDias: Number(config.validezDias),
        nextPresupuestoNumber: Number(config.nextPresupuestoNumber),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Update all existing servicioSlots with new maxSlots
      const slotsSnap = await getDocs(collection(db, "servicioSlots"));
      if (!slotsSnap.empty) {
        const batch = writeBatch(db);
        slotsSnap.forEach((slotDoc) => {
          batch.update(slotDoc.ref, { maxSlots: newSlotsPerDay, updatedAt: serverTimestamp() });
        });
        await batch.commit();
        setMessage(`Configuración guardada. ${slotsSnap.size} fechas actualizadas a ${newSlotsPerDay} cupos.`);
      } else {
        setMessage("Configuración guardada correctamente");
      }
    } catch (err) {
      console.error("Error guardando config servicio:", err);
      setMessage("Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <AdminSidebar />
        <div className="admin-content"><p>Cargando...</p></div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div className="af-header">
          <h1 className="af-page-title">Configuración de Servicio Técnico</h1>
        </div>

        <form className="af-form" onSubmit={(e) => e.preventDefault()}>
          {/* Servicio Técnico */}
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>Servicio Técnico (Diagnóstico)</h2>
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Costo del diagnóstico ($)</label>
              <input
                className="af-input"
                type="number"
                value={config.diagnosticFee}
                onChange={(e) => handleChange("diagnosticFee", e.target.value)}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Validez del presupuesto (días)</label>
              <input
                className="af-input"
                type="number"
                value={config.validezDias}
                onChange={(e) => handleChange("validezDias", e.target.value)}
              />
            </div>
          </div>

          <hr className="af-divider" />

          {/* Service de Mantenimiento */}
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>Service de Mantenimiento — Precios</h2>
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Primaria Común ($)</label>
              <input
                className="af-input"
                type="number"
                value={config.maintenance.primaria_comun}
                onChange={(e) => handleMaintenanceChange("primaria_comun", e.target.value)}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Primaria Plus ($)</label>
              <input
                className="af-input"
                type="number"
                value={config.maintenance.primaria_plus}
                onChange={(e) => handleMaintenanceChange("primaria_plus", e.target.value)}
              />
            </div>
          </div>
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Secundaria Común ($)</label>
              <input
                className="af-input"
                type="number"
                value={config.maintenance.secundaria_comun}
                onChange={(e) => handleMaintenanceChange("secundaria_comun", e.target.value)}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Secundaria Plus ($)</label>
              <input
                className="af-input"
                type="number"
                value={config.maintenance.secundaria_plus}
                onChange={(e) => handleMaintenanceChange("secundaria_plus", e.target.value)}
              />
            </div>
          </div>
          <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
            Plus = lubricantes 4UANTUM (línea premium). Común = lubricantes estándar.
          </p>

          <hr className="af-divider" />

          {/* General */}
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>General</h2>
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Cupos por día (por defecto)</label>
              <input
                className="af-input"
                type="number"
                value={config.defaultSlotsPerDay}
                onChange={(e) => handleChange("defaultSlotsPerDay", e.target.value)}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Prefijo presupuesto</label>
              <input
                className="af-input"
                value={config.presupuestoPrefix}
                onChange={(e) => handleChange("presupuestoPrefix", e.target.value)}
              />
            </div>
          </div>

          <hr className="af-divider" />

          {/* Datos de transferencia */}
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>Datos de transferencia (pago turno)</h2>
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Alias CBU</label>
              <input
                className="af-input"
                value={config.transferAlias || ""}
                onChange={(e) => handleChange("transferAlias", e.target.value)}
                placeholder="genesis.airsoft"
              />
            </div>
            <div className="af-field">
              <label className="af-label">CVU / CBU</label>
              <input
                className="af-input"
                value={config.transferCVU || ""}
                onChange={(e) => handleChange("transferCVU", e.target.value)}
                placeholder="0000003100..."
              />
            </div>
          </div>
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Titular</label>
              <input
                className="af-input"
                value={config.transferHolder || ""}
                onChange={(e) => handleChange("transferHolder", e.target.value)}
                placeholder="Manuel Estrada"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <h3 style={{ color: "#c8f400", fontSize: 14, fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>Ubicaciones (locales)</h3>
            <button
              type="button"
              className="af-save-btn"
              style={{ padding: "6px 14px", fontSize: 12 }}
              onClick={() => handleChange("locations", [...(config.locations || []), { name: "", address: "", mapsUrl: "" }])}
            >
              + Agregar ubicación
            </button>
          </div>

          {(config.locations || []).map((loc, i) => (
            <div key={i} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "14px 16px", display: "grid", gap: 10 }}>
              <div className="af-row" style={{ alignItems: "flex-end" }}>
                <div className="af-field" style={{ flex: 1 }}>
                  <label className="af-label">Nombre del local</label>
                  <input
                    className="af-input"
                    value={loc.name}
                    onChange={(e) => {
                      const locs = [...config.locations];
                      locs[i] = { ...locs[i], name: e.target.value };
                      handleChange("locations", locs);
                    }}
                    placeholder="CABA / Mendoza..."
                  />
                </div>
                <div className="af-field" style={{ flex: 1 }}>
                  <label className="af-label">Dirección (texto)</label>
                  <input
                    className="af-input"
                    value={loc.address}
                    onChange={(e) => {
                      const locs = [...config.locations];
                      locs[i] = { ...locs[i], address: e.target.value };
                      handleChange("locations", locs);
                    }}
                    placeholder="Bruselas 867, CABA"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("locations", config.locations.filter((_, idx) => idx !== i))}
                  style={{ background: "transparent", border: "1px solid #3a1a1a", borderRadius: 8, color: "#f87171", cursor: "pointer", padding: "8px 12px", fontWeight: 900, fontSize: 13, flexShrink: 0, marginBottom: 0, alignSelf: "flex-end" }}
                >
                  ✕
                </button>
              </div>
              <div className="af-field">
                <label className="af-label">Link Google Maps</label>
                <input
                  className="af-input"
                  value={loc.mapsUrl}
                  onChange={(e) => {
                    const locs = [...config.locations];
                    locs[i] = { ...locs[i], mapsUrl: e.target.value };
                    handleChange("locations", locs);
                  }}
                  placeholder="https://www.google.com/maps/place/..."
                />
              </div>
            </div>
          ))}

          <hr className="af-divider" />

          {/* Add-ons / Mejoras */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, margin: 0 }}>Mejoras opcionales (Add-ons)</h2>
            <button
              type="button"
              className="af-save-btn"
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={addAddon}
            >
              + Agregar mejora
            </button>
          </div>

          {config.addons.map((addon, i) => (
            <div key={addon.id} className="af-row" style={{ alignItems: "flex-end" }}>
              <div className="af-field" style={{ flex: 2 }}>
                <label className="af-label">Nombre</label>
                <input
                  className="af-input"
                  value={addon.name}
                  onChange={(e) => handleAddonChange(i, "name", e.target.value)}
                />
              </div>
              <div className="af-field" style={{ flex: 1 }}>
                <label className="af-label">Precio ($)</label>
                <input
                  className="af-input"
                  type="number"
                  value={addon.price}
                  onChange={(e) => handleAddonChange(i, "price", e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeAddon(i)}
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
