import React, { useState, useEffect } from "react";
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { uploadPartidaImage } from "../../firebase/uploadPartidaImage";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";

export default function AdminAddPartida() {
  const [form, setForm] = useState({
    lugar: "",
    direccion: "",
    mapsUrl: "",
    horario: "",
    modalidad: "",
    slotsTotal: 5,
    discountPercent: 0,
    mapFile: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Load default slots from config
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const snap = await getDoc(doc(db, "rentalConfig", "default"));
        if (snap.exists()) {
          const cfg = snap.data();
          setForm((prev) => ({ ...prev, slotsTotal: cfg.defaultSlots || 5 }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadDefaults();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setForm((prev) => ({ ...prev, mapFile: files[0] }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setMessage("");

    if (!form.lugar.trim()) return setMessage("El lugar es obligatorio.");
    if (!form.horario) return setMessage("La fecha y hora son obligatorias.");
    if (!form.modalidad.trim()) return setMessage("La modalidad es obligatoria.");

    const horarioDate = new Date(form.horario);
    if (horarioDate <= new Date()) return setMessage("La fecha debe ser futura.");

    setLoading(true);

    try {
      const partidaRef = await addDoc(collection(db, "partidas"), {
        lugar: form.lugar.trim(),
        direccion: form.direccion.trim(),
        mapsUrl: form.mapsUrl.trim(),
        horario: horarioDate,
        modalidad: form.modalidad.trim(),
        slotsTotal: Number(form.slotsTotal) || 5,
        discountPercent: Number(form.discountPercent) || 0,
        slotsReserved: 0,
        mapImageUrl: "",
        mapImagePath: "",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Upload map image if provided
      if (form.mapFile) {
        const { imageUrl, imagePath } = await uploadPartidaImage(form.mapFile, partidaRef.id);
        await updateDoc(partidaRef, { mapImageUrl: imageUrl, mapImagePath: imagePath });
      }

      setMessage("Partida creada con éxito");
      setForm({
        lugar: "",
        direccion: "",
        mapsUrl: "",
        horario: "",
        modalidad: "",
        slotsTotal: 5,
        discountPercent: 0,
        mapFile: null,
      });
    } catch (err) {
      console.error("Error creando partida:", err);
      setMessage("Error al crear la partida");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div className="af-header">
          <h1 className="af-page-title">Crear Partida</h1>
        </div>

        <form className="af-form" onSubmit={(e) => e.preventDefault()}>
          <div className="af-field">
            <label className="af-label">Lugar *</label>
            <input className="af-input" name="lugar" value={form.lugar} onChange={handleChange} placeholder="Ej: Campo Táctico Norte" />
          </div>

          <div className="af-field">
            <label className="af-label">Dirección</label>
            <input className="af-input" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Ej: Ruta 8 km 42" />
          </div>

          <div className="af-field">
            <label className="af-label">Link de Google Maps</label>
            <input className="af-input" name="mapsUrl" value={form.mapsUrl} onChange={handleChange} placeholder="https://maps.google.com/..." />
          </div>

          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Fecha y hora *</label>
              <input className="af-input" name="horario" type="datetime-local" value={form.horario} onChange={handleChange} />
            </div>
            <div className="af-field">
              <label className="af-label">Modalidad *</label>
              <select className="af-select" name="modalidad" value={form.modalidad} onChange={handleChange}>
                <option value="">Seleccioná...</option>
                <option value="TDM">TDM</option>
                <option value="Domination">Domination</option>
                <option value="Capture the Flag">Capture the Flag</option>
                <option value="Free for All">Free for All</option>
                <option value="MilSim">MilSim</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Cupos de alquiler disponibles</label>
              <input className="af-input" name="slotsTotal" type="number" min="1" value={form.slotsTotal} onChange={handleChange} />
            </div>
            <div className="af-field">
              <label className="af-label">Descuento para esta partida (%)</label>
              <input className="af-input" name="discountPercent" type="number" min="0" max="100" value={form.discountPercent} onChange={handleChange} placeholder="0" />
            </div>
          </div>

          <hr className="af-divider" />

          <div className="af-field">
            <label className="af-label">Imagen del mapa</label>
            <div className="af-file-zone">
              <span className="af-file-zone-icon">🗺️</span>
              <span className="af-file-zone-text">
                {form.mapFile ? form.mapFile.name : "Arrastrá o seleccioná la imagen del mapa"}
              </span>
              <input className="af-file-input" type="file" accept="image/*" onChange={handleChange} />
            </div>
          </div>

          <div className="af-actions">
            <button className="af-save-btn" type="button" onClick={handleSave} disabled={loading}>
              {loading ? "Creando..." : "Crear Partida"}
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
