import React from "react";

function CheckoutPending() {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>🕓 Pago en proceso</h2>
      <p>Tu pago está siendo verificado por Mercado Pago.</p>
      <a href="/">
        <button style={{ marginTop: "20px" }}>Volver al inicio</button>
      </a>
    </div>
  );
}

export default CheckoutPending;
