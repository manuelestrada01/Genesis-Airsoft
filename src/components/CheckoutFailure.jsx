import React from "react";

function CheckoutFailure() {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>❌ Ocurrió un error con tu pago</h2>
      <p>Tu pago no pudo completarse. Podés intentar nuevamente.</p>
      <a href="/cart">
        <button style={{ marginTop: "20px" }}>Volver al carrito</button>
      </a>
    </div>
  );
}

export default CheckoutFailure;
