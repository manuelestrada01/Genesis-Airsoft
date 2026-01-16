import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useEffect, useState } from "react";
import "./OrderDetail.css";

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const ref = doc(db, "orders", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setOrder(null);
          setLoading(false);
          return;
        }

        const raw = snap.data();

        // ============================
        // 🔒 NORMALIZACIÓN DEFENSIVA
        // ============================

        const items = Array.isArray(raw.items) ? raw.items : [];

        // Subtotal real desde items (evita subtotal 0)
        const subtotal = items.reduce(
          (acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0),
          0
        );

        const shipping = raw.shipping || {
          cost: 0,
          free: true,
          label:
            raw.buyer?.method === "pickup"
              ? "Retiro en tienda"
              : "Envío",
        };

        const trackingNumber =
          raw.trackingNumber ||
          raw.tracking?.number ||
          null;

        const totalWithShipping =
          raw.totalWithShipping ??
          subtotal + Number(shipping.cost || 0);

        const normalized = {
          ...raw,
          items,
          buyer: raw.buyer || {},
          shipping,
          total: subtotal,
          totalWithShipping,
          status: raw.status || "pending",
          dispatched: Boolean(raw.dispatched),
          trackingNumber,
        };

        setOrder(normalized);
      } catch (err) {
        console.error("❌ Error cargando pedido:", err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // ============================
  // STATES
  // ============================
  if (loading) {
    return (
      <p style={{ textAlign: "center", marginTop: 50 }}>
        Cargando pedido...
      </p>
    );
  }

  if (!order) {
    return (
      <p style={{ textAlign: "center", marginTop: 50 }}>
        Pedido no encontrado.
      </p>
    );
  }

  const createdDate = order.createdAt?.toDate
    ? order.createdAt.toDate().toLocaleString()
    : "Fecha desconocida";

  // ============================
  // RENDER
  // ============================
  return (
    <div className="order-detail-container">
      <button className="btn-back" onClick={() => navigate("/profile")}>
        ← Volver a mis pedidos
      </button>

      <div className="order-card-detail">
        <h2>Detalle del Pedido</h2>

        <div className="detail-row">
          <span>ID del pedido:</span>
          <strong>{id}</strong>
        </div>

        <div className="detail-row">
          <span>Fecha:</span>
          <strong>{createdDate}</strong>
        </div>

        <div className="detail-row">
          <span>Subtotal:</span>
          <strong>${order.total.toFixed(2)}</strong>
        </div>

        <div className="detail-row">
          <span>Envío:</span>
          <strong>
            {order.shipping.free
              ? order.shipping.label || "Gratis"
              : `$${Number(order.shipping.cost || 0).toFixed(2)}`}
          </strong>
        </div>

        <div className="detail-row">
          <span>Total:</span>
          <strong>${order.totalWithShipping.toFixed(2)}</strong>
        </div>

        <div className="detail-row">
          <span>Estado de pago:</span>
          <span
            className={`status-badge ${
              order.status === "approved" ? "approved" : "pending"
            }`}
          >
            {order.status}
          </span>
        </div>

        {/* =========================== */}
        {/* 📦 ESTADO DEL PEDIDO */}
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
        {/* 🚚 SEGUIMIENTO VIA CARGO */}
        {/* =========================== */}
        {order.dispatched && order.trackingNumber && (
          <div className="section tracking-section">
            <h3>Seguimiento del Envío</h3>

            <div className="detail-row">
              <span>Número de seguimiento:</span>
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
        {/* 🧾 ARTÍCULOS */}
        {/* =========================== */}
        <div className="section">
          <h3>Artículos</h3>
          <ul className="items-list">
            {order.items.map((item, i) => (
              <li key={i} className="item-card">
                <div>
                  <strong>{item.name || "Producto"}</strong>
                </div>
                <div>
                  {item.quantity} × ${Number(item.price).toFixed(2)}
                </div>
                <div>
                  Total: ${(item.quantity * item.price).toFixed(2)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* =========================== */}
        {/* 👤 DATOS DEL COMPRADOR */}
        {/* =========================== */}
        <div className="section">
          <h3>Datos del comprador</h3>
          <div className="buyer-box">
            <p><strong>Nombre:</strong> {order.buyer.name || "—"}</p>
            <p><strong>Email:</strong> {order.buyer.email || "—"}</p>
            <p><strong>Teléfono:</strong> {order.buyer.phone || "—"}</p>
            <p><strong>DNI:</strong> {order.buyer.dni || "—"}</p>
            <p><strong>Método:</strong> {order.buyer.method || "—"}</p>

            {order.buyer.method === "delivery" && (
              <>
                <p>
                  <strong>Dirección:</strong>{" "}
                  {order.buyer.street || ""} {order.buyer.number || ""}
                </p>
                <p><strong>Ciudad:</strong> {order.buyer.city || "—"}</p>
                <p><strong>Provincia:</strong> {order.buyer.province || "—"}</p>
                <p><strong>CP:</strong> {order.buyer.zip || "—"}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
