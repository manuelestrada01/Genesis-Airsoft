import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import { uploadPartidaImage, deletePartidaImage } from "../../firebase/uploadPartidaImage";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";

export default function AdminEditPartida() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newMapFile, setNewMapFile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "partidas", id));
        if (!snap.exists()) {
          setMessage("Partida no encontrada");
          setLoading(false);
          return;
        }
        const data = snap.data();
        const horarioDate = data.horario?.toDate ? data.horario.toDate() : new Date(data.horario);
        // Format for datetime-local input
        const pad = (n) => String(n).padStart(2, "0");
        const horarioStr = `${horarioDate.getFullYear()}-${pad(horarioDate.getMonth() + 1)}-${pad(horarioDate.getDate())}T${pad(horarioDate.getHours())}:${pad(horarioDate.getMinutes())}`;

        setForm({
          lugar: data.lugar || "",
          direccion: data.direccion || "",
          mapsUrl: data.mapsUrl || "",
          horario: horarioStr,
          modalidad: data.modalidad || "",
          slotsTotal: data.slotsTotal || 5,
          discountPercent: data.discountPercent ?? 0,
          status: data.status || "active",
          mapImageUrl: data.mapImageUrl || "",
          mapImagePath: data.mapImagePath || "",
        });
      } catch (err) {
        console.error(err);
        setMessage("Error cargando partida");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setNewMapFile(files[0]);
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setMessage("");
    if (!form.lugar.trim()) return setMessage("El lugar es obligatorio.");
    if (!form.horario) return setMessage("La fecha y hora son obligatorias.");

    setSaving(true);

    try {
      const updates = {
        lugar: form.lugar.trim(),
        direccion: form.direccion.trim(),
        mapsUrl: form.mapsUrl.trim(),
        horario: new Date(form.horario),
        modalidad: form.modalidad.trim(),
        slotsTotal: Number(form.slotsTotal) || 5,
        discountPercent: Number(form.discountPercent) || 0,
        status: form.status,
        updatedAt: serverTimestamp(),
      };

      // Handle map image change
      if (newMapFile) {
        if (form.mapImagePath) {
          try { await deletePartidaImage(form.mapImagePath); } catch { /* ok */ }
        }
        const { imageUrl, imagePath } = await uploadPartidaImage(newMapFile, id);
        updates.mapImageUrl = imageUrl;
        updates.mapImagePath = imagePath;
      }

      await updateDoc(doc(db, "partidas", id), updates);
      setMessage("Partida actualizada con éxito");
    } catch (err) {
      console.error("Error actualizando partida:", err);
      setMessage("Error al actualizar la partida");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-container"><AdminSidebar /><div className="admin-content"><p>Cargando...</p></div></div>;
  if (!form) return <div className="admin-container"><AdminSidebar /><div className="admin-content"><p>Partida no encontrada</p></div></div>;

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div className="af-header">
          <h1 className="af-page-title">Editar Partida</h1>
        </div>

        <form className="af-form" onSubmit={(e) => e.preventDefault()}>
          <div className="af-field">
            <label className="af-label">Lugar *</label>
            <input className="af-input" name="lugar" value={form.lugar} onChange={handleChange} />
          </div>

          <div className="af-field">
            <label className="af-label">Dirección</label>
            <input className="af-input" name="direccion" value={form.direccion} onChange={handleChange} />
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
              <label className="af-label">Cupos totales</label>
              <input className="af-input" name="slotsTotal" type="number" min="1" value={form.slotsTotal} onChange={handleChange} />
            </div>
            <div className="af-field">
              <label className="af-label">Estado</label>
              <select className="af-select" name="status" value={form.status} onChange={handleChange}>
                <option value="active">Activa</option>
                <option value="cancelled">Cancelada</option>
                <option value="completed">Completada</option>
              </select>
            </div>
          </div>

          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Descuento para esta partida (%)</label>
              <input className="af-input" name="discountPercent" type="number" min="0" max="100" value={form.discountPercent} onChange={handleChange} placeholder="0" />
            </div>
            <div className="af-field" />
          </div>

          <hr className="af-divider" />

          {form.mapImageUrl && (
            <div style={{ marginBottom: 16 }}>
              <label className="af-label">Mapa actual</label>
              <img
                src={form.mapImageUrl}
                alt="Mapa"
                style={{ maxWidth: 400, borderRadius: 10, border: "1px solid #2a2a2a" }}
              />
            </div>
          )}

          <div className="af-field">
            <label className="af-label">Cambiar imagen del mapa</label>
            <div className="af-file-zone">
              <span className="af-file-zone-icon">🗺️</span>
              <span className="af-file-zone-text">
                {newMapFile ? newMapFile.name : "Seleccioná una nueva imagen"}
              </span>
              <input className="af-file-input" type="file" accept="image/*" onChange={handleChange} />
            </div>
          </div>

          <div className="af-actions">
            <button className="af-save-btn" type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button
              type="button"
              style={{ padding: "12px 24px", background: "transparent", border: "1px solid #333", color: "#fff", borderRadius: 10, cursor: "pointer", fontWeight: 800 }}
              onClick={() => navigate("/admin/partidas")}
            >
              Volver
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
