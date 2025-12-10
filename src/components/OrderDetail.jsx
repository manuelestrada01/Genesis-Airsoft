import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useEffect, useState } from "react";
import "./OrderDetail.css";

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const ref = doc(db, "orders", id);
      const snap = await getDoc(ref);
      if (snap.exists()) setOrder(snap.data());
    };
    fetchOrder();
  }, [id]);

  if (!order)
    return (
      <p style={{ textAlign: "center", marginTop: "50px" }}>
        Cargando pedido...
      </p>
    );

  const createdDate = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString()
    : "Fecha desconocida";

  return (
    <div className="order-detail-container">
      <button className="btn-back" onClick={() => navigate("/profile")}>
        ← Volver a mis pedidos
      </button>

      <div className="order-card-detail">
        <h2>Detalle del Pedido</h2>

        <div className="detail-row">
          <span>ID del pedido:</span> <strong>{id}</strong>
        </div>

        <div className="detail-row">
          <span>Fecha:</span> <strong>{createdDate}</strong>
        </div>

        <div className="detail-row">
          <span>Total:</span> <strong>${order.total.toFixed(2)}</strong>
        </div>

        <div className="detail-row">
          <span>Estado de pago:</span>
          <span
            className={`status-badge ${
              order.status === "approved" ? "approved" : "pending"
            }`}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>

        {/* =========================== */}
        {/* 🔥 ESTADO DEL PEDIDO */}
        {/* =========================== */}
        <div className="section">
          <h3>Estado del Pedido</h3>

          <div className="timeline">
            <div className={`step ${order.status === "approved" ? "active" : ""}`}>
              <div className="circle"></div>
              <p>Pagado</p>
            </div>

            <div className={`step ${order.status === "approved" ? "active" : ""}`}>
              <div className="circle"></div>
              <p>Preparando</p>
            </div>

            <div className={`step ${order.dispatched ? "active" : ""}`}>
              <div className="circle"></div>
              <p>Despachado</p>
            </div>
          </div>
        </div>

        {/* =========================== */}
        {/* 🔥 SEGUIMIENTO VIA CARGO */}
        {/* =========================== */}
        {order.trackingNumber && (
          <div className="section tracking-section">
            <h3>Seguimiento del Envío</h3>

            <div className="detail-row">
              <span>Número de seguimiento:</span>{" "}
              <strong>{order.trackingNumber}</strong>
            </div>

            <a
              href={`https://viacargo.com.ar/seguimiento-de-envio/${order.trackingNumber}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="tracking-btn"
            >
              Ver seguimiento en Via Cargo
            </a>
          </div>
        )}

        {/* =========================== */}
        {/* 🔥 ARTÍCULOS */}
        {/* =========================== */}
        <div className="section">
          <h3>Artículos</h3>
          <ul className="items-list">
            {order.items.map((item, i) => (
              <li key={i} className="item-card">
                <div>
                  <strong>{item.name}</strong>
                </div>
                <div>
                  {item.quantity} × ${item.price}
                </div>
                <div>Total: ${(item.quantity * item.price).toFixed(2)}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* =========================== */}
        {/* 🔥 DATOS DEL COMPRADOR + DNI */}
        {/* =========================== */}
        <div className="section">
          <h3>Datos del comprador</h3>
          <div className="buyer-box">
            <p>
              <strong>Nombre:</strong> {order.buyer.name}
            </p>
            <p>
              <strong>Email:</strong> {order.buyer.email}
            </p>
            <p>
              <strong>Teléfono:</strong> {order.buyer.phone}
            </p>

            {/* 🔥 DNI NUEVO */}
            <p>
              <strong>DNI:</strong> {order.buyer.dni}
            </p>

            <p>
              <strong>Método:</strong> {order.buyer.method}
            </p>

            {order.buyer.method === "delivery" && (
              <>
                <p>
                  <strong>Dirección:</strong> {order.buyer.street} {order.buyer.number}
                </p>
                <p>
                  <strong>Ciudad:</strong> {order.buyer.city}
                </p>
                <p>
                  <strong>Provincia:</strong> {order.buyer.province}
                </p>
                <p>
                  <strong>CP:</strong> {order.buyer.zip}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
