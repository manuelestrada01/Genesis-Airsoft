// src/components/CheckoutSuccess.jsx
import React, { useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase/config";

function CheckoutSuccess() {
  const { clearCart } = useContext(CartContext);
  const location = useLocation();
  const navigate = useNavigate();

  const query = new URLSearchParams(location.search);
  const paymentId = query.get("payment_id");
  const status = query.get("status");
  const externalReference = query.get("external_reference");

  // 🔥 Limpiar carrito apenas llegamos a esta pantalla
useEffect(() => {
  clearCart();

  if (paymentId) {
    logEvent(analytics, "purchase", {
      transaction_id: paymentId,
      currency: "ARS",
      ...(externalReference && { affiliation: externalReference }),
    });
  }

  // 🔥 Forzar re-render global para que todas las pantallas actualicen el carrito
  setTimeout(() => {
    window.dispatchEvent(new Event("cart-updated"));
  }, 100);
}, []);



  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>✅ ¡Pago realizado con éxito!</h2>
      <p>
        Gracias por tu compra en <b>Genesis Airsoft</b>.
      </p>

      {paymentId && (
        <p>
          Tu ID de pago es: <b>{paymentId}</b>
        </p>
      )}

      {status && (
        <p>
          Estado: <b>{status}</b>
        </p>
      )}

      {externalReference && (
        <p>
          Referencia: <b>{externalReference}</b>
        </p>
      )}

      <button
        onClick={handleGoHome}
        style={{ marginTop: "20px", padding: "10px 20px", cursor: "pointer" }}
      >
        Volver al inicio
      </button>
    </div>
  );
}

export default CheckoutSuccess;
