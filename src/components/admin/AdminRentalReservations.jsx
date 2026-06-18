import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import AdminSidebar from "./AdminSidebar";
import { useNavigate } from "react-router-dom";
import "./admin.css";

export default function AdminRentalReservations() {
  const [reservations, setReservations] = useState([]);
  const [partidas, setPartidas] = useState({});
  const [filter, setFilter] = useState("all");
  const [partidaFilter, setPartidaFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load all partidas for reference
      const partidasSnap = await getDocs(collection(db, "partidas"));
      const partidasMap = {};
      partidasSnap.docs.forEach((d) => {
        partidasMap[d.id] = d.data();
      });
      setPartidas(partidasMap);

      // Load reservations
      const q = query(collection(db, "rentalReservations"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error cargando reservas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = reservations.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (partidaFilter !== "all" && r.partidaId !== partidaFilter) return false;
    return true;
  });

  // Sorted partidas for dropdown (by horario)
  const partidaOptions = Object.entries(partidas)
    .map(([id, p]) => {
      const d = p.horario?.toDate ? p.horario.toDate() : new Date(p.horario);
      return { id, label: `${p.lugar} — ${d.toLocaleDateString("es-AR", { dateStyle: "medium" })}`, date: d };
    })
    .sort((a, b) => a.date - b.date);

  const statusBadge = (status) => {
    const map = {
      pending_payment: { label: "PENDIENTE PAGO", color: "#d97706" },
      confirmed: { label: "CONFIRMADA", color: "#16a34a" },
      expired: { label: "EXPIRADA", color: "#dc2626" },
      cancelled: { label: "CANCELADA", color: "#6b7280" },
    };
    const s = map[status] || { label: status?.toUpperCase(), color: "#555" };
    return (
      <span style={{
        padding: "4px 10px", borderRadius: 6,
        background: s.color, color: "#fff", fontWeight: 800, fontSize: 12,
      }}>
        {s.label}
      </span>
    );
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  };

  const getPartidaInfo = (partidaId) => {
    const p = partidas[partidaId];
    if (!p) return "—";
    const d = p.horario?.toDate ? p.horario.toDate() : new Date(p.horario);
    return `${p.lugar} — ${d.toLocaleDateString("es-AR", { dateStyle: "medium" })}`;
  };

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <h1 style={{ color: "#fff" }}>Reservas de Alquiler</h1>

        <div style={{ marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Status filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "all", label: "Todas" },
              { key: "pending_payment", label: "Pendientes" },
              { key: "confirmed", label: "Confirmadas" },
              { key: "expired", label: "Expiradas" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className="admin-filter-btn"
                style={{ background: filter === key ? "#c8f400" : "#1a1a1a", color: filter === key ? "#000" : "#fff" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Partida filter */}
          <select
            value={partidaFilter}
            onChange={(e) => setPartidaFilter(e.target.value)}
            style={{
              background: "#1a1a1a", color: "#fff", border: "1px solid #333",
              borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              outline: "none", minWidth: 200,
            }}
          >
            <option value="all">Todas las partidas</option>
            {partidaOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {/* Count */}
          <span style={{ color: "#888", fontSize: 13, fontWeight: 700 }}>
            {filtered.length} reserva{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <p style={{ color: "#888" }}>Cargando...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#888" }}>No hay reservas en esta categoría.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha reserva</th>
                <th>Partida</th>
                <th>Cliente</th>
                <th>Seña</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/admin/alquileres/${r.id}`)}
                >
                  <td data-label="Fecha">{formatDate(r.createdAt)}</td>
                  <td data-label="Partida">{getPartidaInfo(r.partidaId)}</td>
                  <td data-label="Cliente">
                    {r.user?.name}
                    <br />
                    <small style={{ color: "#888" }}>{r.user?.email}</small>
                  </td>
                  <td data-label="Seña">
                    ${(r.pricing?.deposit || 0).toLocaleString("es-AR")}
                  </td>
                  <td data-label="Estado">{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
