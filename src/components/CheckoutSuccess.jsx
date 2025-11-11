import React from "react";
import { useLocation } from "react-router-dom";

function CheckoutSuccess() {
  const query = new URLSearchParams(useLocation().search);
  const paymentId = query.get("payment_id");
  const status = query.get("status");
  const externalReference = query.get("external_reference");

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>✅ ¡Pago realizado con éxito!</h2>
      <p>Gracias por tu compra en <b>Genesis Airsoft</b>.</p>
      <p>Tu ID de pago es: <b>{paymentId}</b></p>
      <p>Estado: <b>{status}</b></p>
      <p>Referencia: <b>{externalReference}</b></p>
      <a href="/" style={{ textDecoration: "none" }}>
        <button style={{ marginTop: "20px" }}>Volver al inicio</button>
      </a>
    </div>
  );
}

export default CheckoutSuccess;
