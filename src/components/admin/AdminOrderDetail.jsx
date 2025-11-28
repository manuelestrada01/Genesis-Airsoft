import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./admin.css";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      const ref = doc(db, "orders", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setOrder({ id: snap.id, ...snap.data() });
      }

      setLoading(false);
    };

    loadOrder();
  }, [id]);

  const markAsDispatched = async () => {
    const confirmSend = window.confirm("¿Marcar este pedido como despachado?");
    if (!confirmSend) return;

    await updateDoc(doc(db, "orders", id), { dispatched: true });
    setOrder((prev) => ({ ...prev, dispatched: true }));
  };

  if (loading) return <p>Cargando pedido...</p>;
  if (!order) return <p>Pedido no encontrado.</p>;

  return (
    <div className="admin-content">
      {/* Número de pedido bien visible */}
      <h1>Pedido #{order.id}</h1>

      <h3>Datos del Pedido</h3>
      <p><strong>Número de pedido:</strong> {order.id}</p>
      <p><strong>Fecha:</strong> {order.createdAt?.toDate().toLocaleString()}</p>

      <h3>Cliente</h3>
      <p><strong>Nombre:</strong> {order.buyer?.name}</p>
      <p><strong>Email:</strong> {order.buyer?.email}</p>
      <p><strong>Teléfono:</strong> {order.buyer?.phone}</p>

      <h3>Dirección</h3>
      {order.buyer?.street ? (
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
          <button className="admin-not-dispatched" onClick={markAsDispatched}>
            Marcar como despachado
          </button>
        )}
      </p>
    </div>
  );
}
