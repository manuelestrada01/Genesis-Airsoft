import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./admin.css";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Para el tracking number
  const [tracking, setTracking] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      const ref = doc(db, "orders", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setOrder({ id: snap.id, ...data });
        setTracking(data.trackingNumber || "");
      }

      setLoading(false);
    };

    loadOrder();
  }, [id]);

  const saveTracking = async () => {
    if (!tracking.trim()) {
      alert("El número de seguimiento no puede estar vacío.");
      return;
    }

    if (!confirm("¿Guardar número de seguimiento en este pedido?")) return;

    setSavingTracking(true);

    try {
      await updateDoc(doc(db, "orders", id), {
        trackingNumber: tracking.trim(),
      });

      setOrder((prev) => ({
        ...prev,
        trackingNumber: tracking.trim(),
      }));

      alert("Número de seguimiento guardado correctamente ✔");
    } catch (err) {
      console.error("Error guardando seguimiento:", err);
      alert("No se pudo guardar el número de seguimiento.");
    } finally {
      setSavingTracking(false);
    }
  };

  if (loading) return <p>Cargando pedido...</p>;
  if (!order) return <p>Pedido no encontrado.</p>;

  return (
    <div className="admin-content">
      <h1>Pedido #{order.id}</h1>

      <h3>Datos del Pedido</h3>
      <p><strong>Fecha:</strong> {order.createdAt?.toDate().toLocaleString()}</p>

      <h3>Cliente</h3>
      <p><strong>Nombre:</strong> {order.buyer?.name}</p>
      <p><strong>Email:</strong> {order.buyer?.email}</p>
      <p><strong>Teléfono:</strong> {order.buyer?.phone}</p>

      {/* 🔥 DNI agregado */}
      {order.buyer?.dni && (
        <p><strong>DNI:</strong> {order.buyer.dni}</p>
      )}

      <h3>Dirección</h3>
      {order.buyer?.method === "delivery" ? (
        <>
          <p>{order.buyer.street} {order.buyer.number}</p>
          <p>{order.buyer.city}, {order.buyer.province}</p>
          <p>CP: {order.buyer.zip}</p>
        </>
      ) : (
        <p><i>Retiro en tienda</i></p>
      )}

      <h3>Items</h3>
      <ul>
        {order.items?.map((item, i) => (
          <li key={i}>
            {item.name} — {item.quantity} × ${item.price}
          </li>
        ))}
      </ul>

      <h3>Total</h3>
      <p>${order.total}</p>

      <h3>Estado</h3>
      <p>
        {order.dispatched ? (
          <span className="admin-dispatched">Despachado</span>
        ) : (
          <span className="admin-not-dispatched">Pendiente</span>
        )}
      </p>

      {/* ======================================= */}
      {/* 🔥 SEGUIMIENTO VIA CARGO (ADMIN) */}
      {/* ======================================= */}
      <div style={{ marginTop: "30px" }}>
        <h3>Seguimiento (Via Cargo)</h3>

        <input
          type="text"
          placeholder="Ej: 999029504038"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          className="admin-input"
          style={{
            padding: "10px",
            width: "300px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            marginRight: "10px"
          }}
        />

        <button
          onClick={saveTracking}
          disabled={savingTracking}
          className="admin-save-btn"
        >
          {savingTracking ? "Guardando..." : "Guardar seguimiento"}
        </button>

        {order.trackingNumber && (
          <div style={{ marginTop: "15px" }}>
            <a
              href={`https://viacargo.com.ar/seguimiento-de-envio/${order.trackingNumber}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-track-link"
              style={{
                display: "inline-block",
                marginTop: "10px",
                padding: "8px 12px",
                background: "#0077ff",
                color: "white",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "bold"
              }}
            >
              Ver seguimiento en Via Cargo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
