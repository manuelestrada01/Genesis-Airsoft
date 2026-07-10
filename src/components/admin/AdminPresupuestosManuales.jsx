import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import AdminSidebar from "./AdminSidebar";
import { useNavigate } from "react-router-dom";
import "./admin.css";

const STATUS_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "borrador", label: "Borrador" },
  { key: "enviado", label: "Enviado" },
];

const STATUS_BADGE = {
  borrador: { label: "BORRADOR", color: "#d97706" },
  enviado:  { label: "ENVIADO",  color: "#2563eb" },
};

const IcoDoc = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
    strokeLinecap="round" strokeLinejoin="round" style={{ color: "#333" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

export default function AdminPresupuestosManuales() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, "presupuestosManuales"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setPresupuestos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error cargando presupuestos:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = presupuestos.filter((p) => filter === "all" || p.status === filter);

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const statusBadge = (status) => {
    const s = STATUS_BADGE[status] || { label: (status || "—").toUpperCase(), color: "#555" };
    return (
      <span style={{
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.8,
        background: s.color + "1a",
        color: s.color,
        border: `1px solid ${s.color}55`,
        whiteSpace: "nowrap",
      }}>
        {s.label}
      </span>
    );
  };

  const counts = {
    all: presupuestos.length,
    borrador: presupuestos.filter((p) => p.status === "borrador").length,
    enviado: presupuestos.filter((p) => p.status === "enviado").length,
  };

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
          <div>
            <h1 style={{ color: "#fff", margin: "0 0 4px", fontSize: 26, fontWeight: 800 }}>
              Presupuestos Manuales
            </h1>
            <p style={{ color: "#666", fontSize: 13, margin: 0 }}>
              Presupuestos independientes, sin turno de servicio asociado
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/presupuestos-manuales/nuevo")}
            style={{
              flexShrink: 0,
              background: "#c8f400",
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            Nuevo Presupuesto
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          {STATUS_FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="admin-filter-btn"
                style={{
                  background: isActive ? "#c8f400" : "#1a1a1a",
                  color: isActive ? "#000" : "#aaa",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {f.label}
                <span style={{
                  background: isActive ? "#00000022" : "#2a2a2a",
                  color: isActive ? "#000" : "#666",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 7px",
                  minWidth: 20,
                  textAlign: "center",
                }}>
                  {counts[f.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#555", fontSize: 14 }}>
            Cargando presupuestos...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "72px 20px",
            gap: 16,
            background: "#111",
            borderRadius: 12,
            border: "1px dashed #2a2a2a",
          }}>
            <IcoDoc />
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#555", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>
                {filter === "all" ? "Todavía no hay presupuestos" : `Sin presupuestos con estado "${filter}"`}
              </p>
              <p style={{ color: "#3a3a3a", fontSize: 13, margin: 0 }}>
                {filter === "all" ? "Creá el primero haciendo click en el botón de arriba." : "Probá con otro filtro."}
              </p>
            </div>
            {filter === "all" && (
              <button
                onClick={() => navigate("/admin/presupuestos-manuales/nuevo")}
                style={{
                  marginTop: 4,
                  background: "#1a1a1a",
                  color: "#c8f400",
                  border: "1px solid #c8f40033",
                  borderRadius: 8,
                  padding: "9px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Nuevo Presupuesto
              </button>
            )}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Cliente</th>
                <th>Descripción</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/admin/presupuestos-manuales/${p.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td data-label="N°">
                    <span style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#c8f400",
                      background: "#c8f40011",
                      padding: "2px 8px",
                      borderRadius: 5,
                      whiteSpace: "nowrap",
                    }}>
                      {p.numero || "—"}
                    </span>
                  </td>
                  <td data-label="Cliente">
                    <div style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>
                      {p.cliente?.nombre || "—"}
                    </div>
                    {p.cliente?.telefono && (
                      <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                        {p.cliente.telefono}
                      </div>
                    )}
                  </td>
                  <td data-label="Descripción" style={{ maxWidth: 240 }}>
                    <span style={{
                      fontSize: 13,
                      color: "#aaa",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {p.descripcion || <em style={{ color: "#444" }}>Sin descripción</em>}
                    </span>
                  </td>
                  <td data-label="Total">
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
                      ${Number(p.totalAPagar || 0).toLocaleString("es-AR")}
                    </span>
                    {p.descuentoPercent > 0 && (
                      <span style={{ fontSize: 11, color: "#16a34a", marginLeft: 6 }}>
                        -{p.descuentoPercent}%
                      </span>
                    )}
                  </td>
                  <td data-label="Estado">{statusBadge(p.status)}</td>
                  <td data-label="Fecha" style={{ color: "#555", fontSize: 13, whiteSpace: "nowrap" }}>
                    {formatDate(p.createdAt)}
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
