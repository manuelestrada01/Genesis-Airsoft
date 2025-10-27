import React, { useContext } from "react";
import { CheckoutContext } from "../context/CheckoutContext";

function Checkout() {
  const {
    buyer,
    handleBuyerChange,
    orderId,
    loading,
    error,
    success,
    completeCheckout,
  } = useContext(CheckoutContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await completeCheckout(); // 🔹 crea la orden y vacía el carrito
  };

  return (
    <div style={{ padding: "40px", marginTop: "100px" }}>
      <h2>Finalizar Compra 🧾</h2>

      {orderId ? (
        <div>
          <h3>{success}</h3>
          <p>
            Tu ID de pedido es: <strong>{orderId}</strong>
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "400px",
            gap: "10px",
          }}
        >
          <input
            type="text"
            name="name"
            placeholder="Nombre"
            value={buyer.name}
            onChange={handleBuyerChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Correo electrónico"
            value={buyer.email}
            onChange={handleBuyerChange}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Teléfono"
            value={buyer.phone}
            onChange={handleBuyerChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Procesando..." : "Finalizar compra"}
          </button>

          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      )}
    </div>
  );
}

export default Checkout;
