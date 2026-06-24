import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import AdminSidebar from "./AdminSidebar";
import { useNavigate } from "react-router-dom";
import "./admin.css";

const STATUS_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "pending_approval", label: "Pendientes" },
  { key: "approved", label: "Aprobados" },
  { key: "in_progress", label: "En proceso" },
  { key: "completed", label: "Completados" },
  { key: "rejected", label: "Rechazados" },
];

const STATUS_BADGE = {
  pending_approval: { label: "PENDIENTE", color: "#d97706" },
  approved: { label: "APROBADO", color: "#2563eb" },
  in_progress: { label: "EN PROCESO", color: "#ea580c" },
  completed: { label: "COMPLETADO", color: "#16a34a" },
  cancelled: { label: "CANCELADO", color: "#6b7280" },
  rejected: { label: "RECHAZADO", color: "#dc2626" },
};

export default function AdminServicioTurnos() {
  const [turnos, setTurnos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, "servicioTurnos"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setTurnos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error cargando turnos:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = filter === "all" ? turnos : turnos.filter((t) => t.status === filter);

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  };

  const serviceLabel = (t) => {
    if (t.serviceType === "tecnico") return "Servicio Técnico";
    return `Mant. ${t.maintenanceSubtype || ""} ${t.maintenanceVariant || ""}`;
  };

  const statusBadge = (status) => {
    const s = STATUS_BADGE[status] || { label: status?.toUpperCase(), color: "#555" };
    return (
      <span style={{
        padding: "4px 10px", borderRadius: 6,
        background: s.color, color: "#fff", fontWeight: 800, fontSize: 11,
        whiteSpace: "nowrap",
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ color: "#fff", margin: "0 0 4px" }}>Turnos de Servicio Técnico</h1>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
            {turnos.length} turno{turnos.length !== 1 ? "s" : ""} en total
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="admin-filter-btn"
              style={{ background: filter === key ? "#c8f400" : "#1a1a1a", color: filter === key ? "#000" : "#fff" }}
            >
              {label}
            </button>
          ))}
          <span style={{ color: "#888", fontSize: 13, fontWeight: 700, alignSelf: "center" }}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <p style={{ color: "#888" }}>Cargando...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#888" }}>No hay turnos en esta categoría.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha turno</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Réplica</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/admin/servicio/${t.id}`)}
                >
                  <td data-label="Fecha turno">
                    <strong style={{ color: "#c8f400" }}>{t.scheduledDate}</strong>
                    <br />
                    <small style={{ color: "#888" }}>{formatDate(t.createdAt)}</small>
                  </td>
                  <td data-label="Cliente">
                    {t.user?.name}
                    {t.isRedeemed && <span style={{ marginLeft: 4, color: "#fbbf24", fontSize: 11 }}>⭐</span>}
                    <br />
                    <small style={{ color: "#888" }}>{t.user?.email}</small>
                  </td>
                  <td data-label="Servicio">{serviceLabel(t)}</td>
                  <td data-label="Réplica">
                    {t.replica?.marca} {t.replica?.modelo}
                    <br />
                    <small style={{ color: "#888" }}>{t.replica?.tipo}</small>
                  </td>
                  <td data-label="Total">
                    {t.isRedeemed
                      ? <span style={{ color: "#fbbf24" }}>Canjeado</span>
                      : `$${Number(t.pricing?.total || 0).toLocaleString("es-AR")}`
                    }
                  </td>
                  <td data-label="Estado">{statusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
