// src/components/CheckoutSuccess.jsx
import React, { useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase/config";
import "./CheckoutSuccess.css";

function CheckoutSuccess() {
  const { clearCart } = useContext(CartContext);
  const location = useLocation();
  const navigate = useNavigate();

  const query = new URLSearchParams(location.search);
  const paymentId = query.get("payment_id") || query.get("collection_id");
  const status = query.get("status") || query.get("collection_status");
  const externalReference = query.get("external_reference");

  useEffect(() => {
    clearCart();
    setTimeout(() => {
      window.dispatchEvent(new Event("cart-updated"));
    }, 100);

    if (paymentId) {
      logEvent(analytics, "purchase", {
        transaction_id: paymentId,
        currency: "ARS",
        ...(externalReference && { affiliation: externalReference }),
      });
    }
  }, []);

  const statusLabel = {
    approved: "Aprobado",
    pending:  "Pendiente",
    rejected: "Rechazado",
  }[status] ?? status;

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon-wrap">
          <div className="success-icon-ring" />
          <span className="success-icon-check">✓</span>
        </div>

        <h1 className="success-title">¡Compra realizada!</h1>
        <p className="success-subtitle">
          Gracias por tu compra en <b>Genesis Airsoft</b>.
          <br />Pronto recibirás tu pedido.
        </p>

        {(paymentId || status || externalReference) && (
          <div className="success-details">
            {paymentId && (
              <div className="success-detail-row">
                <span className="success-detail-label">ID de pago</span>
                <span className="success-detail-value">{paymentId}</span>
              </div>
            )}
            {status && (
              <div className="success-detail-row">
                <span className="success-detail-label">Estado</span>
                <span className="success-detail-value accent">{statusLabel}</span>
              </div>
            )}
            {externalReference && (
              <div className="success-detail-row">
                <span className="success-detail-label">Referencia</span>
                <span className="success-detail-value">{externalReference}</span>
              </div>
            )}
          </div>
        )}

        <p className="success-email-note">
          Recibirás un email de confirmación con los detalles de tu pedido.
        </p>

        <button className="success-btn" onClick={() => navigate("/")}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default CheckoutSuccess;
