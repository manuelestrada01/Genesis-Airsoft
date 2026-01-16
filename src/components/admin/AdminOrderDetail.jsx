import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./admin.css";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tracking Via Cargo
  const [tracking, setTracking] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const ref = doc(db, "orders", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setOrder(null);
          return;
        }

        const raw = snap.data();

        const normalized = {
          id: snap.id,
          ...raw,
          buyer: raw.buyer || {},
          items: Array.isArray(raw.items) ? raw.items : [],
          shipping: raw.shipping || {
            cost: 0,
            free: true,
            label:
              raw.buyer?.method === "pickup" ? "Retiro en tienda" : "No especificado",
          },
          // OJO: esto puede venir 0 en órdenes nuevas/previas
          total: Number(raw.total || 0),
          totalWithShipping: Number(
            raw.totalWithShipping ?? 0
          ),
          status: raw.status || "pending",
          dispatched: !!raw.dispatched,
          trackingNumber: raw.trackingNumber || "",
        };

        setOrder(normalized);
        setTracking(raw.trackingNumber || "");
      } catch (err) {
        console.error("Error cargando pedido:", err);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  // ✅ Subtotal calculado desde items si order.total es 0/undefined
  const computedSubtotal = useMemo(() => {
    if (!order) return 0;

    const subtotalFromItems = (order.items || []).reduce((acc, it) => {
      const q = Number(it.quantity || 0);
      const p = Number(it.price || 0);
      return acc + q * p;
    }, 0);

    // Si el total guardado es válido (> 0), lo usamos. Si no, usamos el calculado.
    return order.total > 0 ? order.total : subtotalFromItems;
  }, [order]);

  // ✅ Shipping robusto
  const shippingCost = useMemo(() => {
    if (!order) return 0;
    const c = Number(order.shipping?.cost || 0);
    return isNaN(c) ? 0 : c;
  }, [order]);

  // ✅ Total final: si no viene guardado, lo calculamos
  const computedTotalFinal = useMemo(() => {
    if (!order) return 0;
    const saved = Number(order.totalWithShipping || 0);
    if (saved > 0) return saved;
    return computedSubtotal + shippingCost;
  }, [order, computedSubtotal, shippingCost]);

  // ✅ Comentario: soporta aliases y muestra “—” si está vacío
  const buyerNotes = useMemo(() => {
    if (!order) return "";
    const b = order.buyer || {};
    // aliases por si alguna orden vieja lo guardó distinto
    const value =
      b.notes ??
      b.note ??
      b.comentario ??
      b.comment ??
      b.observaciones ??
      "";
    return typeof value === "string" ? value : String(value ?? "");
  }, [order]);

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
        dispatched: true,
      });

      setOrder((prev) => ({
        ...prev,
        trackingNumber: tracking.trim(),
        dispatched: true,
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
      <p>
        <strong>Fecha:</strong>{" "}
        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : "—"}
      </p>

      <h3>Cliente</h3>
      <p><strong>Nombre:</strong> {order.buyer?.name || "—"}</p>
      <p><strong>Email:</strong> {order.buyer?.email || "—"}</p>
      <p><strong>Teléfono:</strong> {order.buyer?.phone || "—"}</p>
      {order.buyer?.dni && <p><strong>DNI:</strong> {order.buyer.dni}</p>}

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

      {/* ✅ Comentario siempre visible (si no hay, muestra —) */}
      <h3>Comentario del envío</h3>
      <p style={{ whiteSpace: "pre-wrap" }}>
        {buyerNotes.trim() ? buyerNotes : "—"}
      </p>

      <h3>Items</h3>
      <ul>
        {order.items.map((item, i) => (
          <li key={i}>
            {item.name || "Producto"} — {Number(item.quantity || 0)} × $
            {Number(item.price || 0)} = $
            {(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)}
          </li>
        ))}
      </ul>

      <h3>Totales</h3>
      <p><strong>Subtotal:</strong> ${computedSubtotal.toFixed(2)}</p>
      <p>
        <strong>Envío:</strong>{" "}
        {order.buyer?.method === "pickup"
          ? "Retiro en tienda"
          : shippingCost === 0
            ? "Gratis"
            : `$${shippingCost.toFixed(2)}`}
      </p>
      <p><strong>Total final:</strong> ${computedTotalFinal.toFixed(2)}</p>

      <h3>Estado</h3>
      <p>
        {order.dispatched ? (
          <span className="admin-dispatched">Despachado</span>
        ) : (
          <span className="admin-not-dispatched">Pendiente</span>
        )}
      </p>

      {/* Via Cargo */}
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
            marginRight: "10px",
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
                fontWeight: "bold",
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
