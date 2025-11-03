import React, { useContext, useState } from "react";
import { CheckoutContext } from "../context/CheckoutContext";
import { CartContext } from "../context/CartContext";
import AuthContext from "../context/AuthContext";

function Checkout() {
  const { buyer, handleBuyerChange, orderId, loading, error, success, completeCheckout } =
    useContext(CheckoutContext);
  const { cart, totalPrice } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [processingPayment, setProcessingPayment] = useState(false);

  // 🔹 Crear la orden en Firestore y luego generar la preferencia de pago
  const handlePayment = async (e) => {
    e.preventDefault();

    try {
      setProcessingPayment(true);

      // 1️⃣ Crear la orden en Firestore
      await completeCheckout();

      // 2️⃣ Crear la preferencia de pago en Firebase Function
      const response = await fetch(
  "https://createpreference-jin2ghc5ya-uc.a.run.app",

        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            userId: user?.uid || "guest",
            orderId: orderId,
            total: totalPrice,
          }),
        }
      );

      const data = await response.json();

      if (data.id) {
        // 3️⃣ Redirigir al Checkout Pro
        window.location.href = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${data.id}`;
      } else {
        alert("❌ No se pudo crear la preferencia de pago.");
      }
    } catch (err) {
      console.error("❌ Error en el pago:", err);
      alert("Ocurrió un error al procesar el pago con Mercado Pago.");
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div style={{ padding: "40px", marginTop: "100px" }}>
      <h2>Complete Your Purchase 🧾</h2>

      {orderId ? (
        <div>
          <h3>{success || "✅ Order created successfully!"}</h3>
          <p>
            Your order ID is: <strong>{orderId}</strong>
          </p>
          <p>Total amount: <strong>${totalPrice.toFixed(2)}</strong></p>

          <button
            onClick={handlePayment}
            disabled={processingPayment}
            style={{
              marginTop: "20px",
              backgroundColor: "#009EE3",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
          >
            {processingPayment ? "Processing payment..." : "Pay with Mercado Pago"}
          </button>
        </div>
      ) : (
        <form
          onSubmit={handlePayment}
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
            placeholder="Full name"
            value={buyer.name}
            onChange={handleBuyerChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={buyer.email}
            onChange={handleBuyerChange}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone number"
            value={buyer.phone}
            onChange={handleBuyerChange}
            required
          />

          <button
            type="submit"
            disabled={loading || processingPayment}
            style={{
              marginTop: "10px",
              backgroundColor: "#222",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              cursor: "pointer",
              borderRadius: "6px",
            }}
          >
            {loading || processingPayment
              ? "Processing..."
              : "Confirm and Pay"}
          </button>

          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      )}
    </div>
  );
}

export default Checkout;
