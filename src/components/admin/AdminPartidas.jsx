import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { deletePartidaImage } from "../../firebase/uploadPartidaImage";
import AdminSidebar from "./AdminSidebar";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import "./admin.css";

export default function AdminPartidas() {
  const [partidas, setPartidas] = useState([]);
  const [filter, setFilter] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPartidas();
  }, []);

  const loadPartidas = async () => {
    try {
      const q = query(collection(db, "partidas"), orderBy("horario", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPartidas(list);
    } catch (err) {
      console.error("Error cargando partidas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = partidas.filter((p) => {
    const now = new Date();
    const horario = p.horario?.toDate ? p.horario.toDate() : new Date(p.horario);

    if (filter === "upcoming") return horario > now && p.status === "active";
    if (filter === "past") return horario <= now || p.status === "completed";
    if (filter === "cancelled") return p.status === "cancelled";
    return true;
  });

  const toggleStatus = (partida) => {
    const newStatus = partida.status === "active" ? "cancelled" : "active";
    setDialog({
      title: newStatus === "cancelled" ? "Cancelar partida" : "Reactivar partida",
      message: newStatus === "cancelled" ? "¿Cancelar esta partida?" : "¿Reactivar esta partida?",
      confirmLabel: newStatus === "cancelled" ? "Cancelar partida" : "Reactivar",
      danger: newStatus === "cancelled",
      onConfirm: async () => {
        setDialog(null);
        await updateDoc(doc(db, "partidas", partida.id), { status: newStatus });
        setPartidas((prev) => prev.map((p) => (p.id === partida.id ? { ...p, status: newStatus } : p)));
      },
    });
  };

  const deletePartida = (partida) => {
    setDialog({
      title: "Eliminar partida",
      message: "¿Eliminar esta partida? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: async () => {
        setDialog(null);
        try {
          if (partida.mapImagePath) {
            try { await deletePartidaImage(partida.mapImagePath); } catch { /* ok */ }
          }
          await deleteDoc(doc(db, "partidas", partida.id));
          setPartidas((prev) => prev.filter((p) => p.id !== partida.id));
        } catch (err) {
          console.error("Error eliminando partida:", err);
        }
      },
    });
  };

  const statusBadge = (status) => {
    const colors = {
      active: "#16a34a",
      cancelled: "#dc2626",
      completed: "#6b7280",
    };
    return (
      <span style={{
        padding: "4px 10px",
        borderRadius: 6,
        background: colors[status] || "#555",
        color: "#fff",
        fontWeight: 800,
        fontSize: 12,
      }}>
        {status === "active" ? "ACTIVA" : status === "cancelled" ? "CANCELADA" : "COMPLETADA"}
      </span>
    );
  };

  const formatDate = (horario) => {
    const d = horario?.toDate ? horario.toDate() : new Date(horario);
    return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div className="admin-container">
      <ConfirmDialog
        isOpen={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        danger={dialog?.danger}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
      />
      <AdminSidebar />
      <div className="admin-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <h1 style={{ margin: 0, color: "#fff" }}>Partidas</h1>
          <button className="af-save-btn" style={{ padding: "10px 20px" }} onClick={() => navigate("/admin/partidas/add")}>
            + Nueva Partida
          </button>
        </div>

        <div style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["upcoming", "past", "cancelled", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="admin-filter-btn"
              style={{ background: filter === f ? "#c8f400" : "#1a1a1a", color: filter === f ? "#000" : "#fff" }}
            >
              {f === "upcoming" ? "Próximas" : f === "past" ? "Pasadas" : f === "cancelled" ? "Canceladas" : "Todas"}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#888" }}>Cargando...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#888" }}>No hay partidas en esta categoría.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Lugar</th>
                <th>Modalidad</th>
                <th>Cupos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/admin/partidas/edit/${p.id}`)}>
                  <td data-label="Fecha">{formatDate(p.horario)}</td>
                  <td data-label="Lugar">
                    {p.lugar}
                    {p.direccion && <><br /><small style={{ color: "#888" }}>{p.direccion}</small></>}
                  </td>
                  <td data-label="Modalidad">{p.modalidad}</td>
                  <td data-label="Cupos">
                    <span style={{ color: "#c8f400", fontWeight: 800 }}>{p.slotsReserved || 0}</span>
                    /{p.slotsTotal || 0}
                  </td>
                  <td data-label="Estado">{statusBadge(p.status)}</td>
                  <td data-label="Acciones" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => toggleStatus(p)}
                        style={{
                          padding: "6px 10px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer",
                          background: p.status === "active" ? "#dc2626" : "#16a34a",
                          color: "#fff",
                        }}
                      >
                        {p.status === "active" ? "Cancelar" : "Reactivar"}
                      </button>
                      <button
                        onClick={() => deletePartida(p)}
                        style={{
                          padding: "6px 10px", borderRadius: 6, border: "1px solid #333", background: "transparent",
                          color: "#888", fontSize: 12, fontWeight: 800, cursor: "pointer",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
