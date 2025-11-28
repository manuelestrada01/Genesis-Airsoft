import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";
import { useNavigate } from "react-router-dom";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("day"); // day | week | month
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    const today = new Date();
    let startDate;

    if (filter === "day") {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    } else if (filter === "week") {
      const firstDay = today.getDate() - today.getDay();
      startDate = new Date(today.setDate(firstDay));
    } else if (filter === "month") {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const q = query(
      collection(db, "orders"),
      where("createdAt", ">=", startDate),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setOrders(list);
  };

  /* 🔥 Cambiar estado de despachado */
  const toggleDispatch = async (orderId, currentStatus) => {
    const confirmSend = window.confirm(
      currentStatus
        ? "¿Marcar este pedido como NO despachado?"
        : "¿Marcar este pedido como DESPACHADO?"
    );

    if (!confirmSend) return;

    await updateDoc(doc(db, "orders", orderId), {
      dispatched: !currentStatus
    });

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, dispatched: !currentStatus } : o
      )
    );
  };

  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <h1>Pedidos</h1>

        {/* BOTONES DE FILTRO */}
        <div style={{ marginBottom: "20px" }}>
          <button onClick={() => setFilter("day")} className="admin-filter-btn">
            Hoy
          </button>
          <button onClick={() => setFilter("week")} className="admin-filter-btn">
            Última semana
          </button>
          <button onClick={() => setFilter("month")} className="admin-filter-btn">
            Último mes
          </button>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
                <th>Fecha</th>
                <th>Pedido #</th>
                <th>Cliente</th>
                <th>Items</th>
                <th>Total</th>
                <th>Despachado</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="order-row"
                onClick={() => navigate(`/admin/orders/${o.id}`)}
                style={{ cursor: "pointer" }}
              >
                {/* FECHA */}
                <td>{o.createdAt?.toDate().toLocaleString()}</td>

                {/* NUMERO P */}
                <td>{o.id}</td>


                {/* CLIENTE */}
                <td>
                  {o.buyer?.name} <br />
                  <small>{o.buyer?.email}</small>
                </td>

                {/* ITEMS */}
                <td>
                  {o.items?.map((it, i) => (
                    <div key={i}>• {it.name} × {it.quantity}</div>
                  ))}
                </td>

                {/* TOTAL */}
                <td>${o.total}</td>

                {/* DESPACHADO */}
                <td onClick={(e) => e.stopPropagation() /* ⬅ no abrir detalle */}>
                  <button
                    className={
                      o.dispatched ? "admin-dispatched" : "admin-not-dispatched"
                    }
                    onClick={() => toggleDispatch(o.id, o.dispatched)}
                  >
                    {o.dispatched ? "Despachado" : "Pendiente"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
}
