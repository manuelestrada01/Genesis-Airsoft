import React, { useState, useContext } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { CartContext } from "../context/CartContext";

function Checkout() {
  const { cart } = useContext(CartContext);

  const [buyer, setBuyer] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);

  const total = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleChange = (e) => {
    setBuyer({ ...buyer, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Enviando pedido..."); // 🧩 Para verificar que el submit se ejecuta
    setLoading(true);

    const order = {
      buyer,
      items: cart,
      total,
      date: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), order);
      console.log("Pedido guardado con ID:", docRef.id);
      setOrderId(docRef.id);
    } catch (error) {
      console.error("Error guardando pedido:", error);
      alert("Error al registrar el pedido. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "40px", marginTop: "100px" }}>
      <h2>Finalizar Compra 🧾</h2>

      {orderId ? (
        <div>
          <h3>✅ Pedido realizado correctamente</h3>
          <p>Tu ID de pedido es: <strong>{orderId}</strong></p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", maxWidth: "400px", gap: "10px" }}>
          <input
            type="text"
            name="name"
            placeholder="Nombre"
            value={buyer.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={buyer.email}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Teléfono"
            value={buyer.phone}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Procesando..." : "Finalizar compra"}
          </button>
        </form>
      )}
    </div>
  );
}

export default Checkout;
