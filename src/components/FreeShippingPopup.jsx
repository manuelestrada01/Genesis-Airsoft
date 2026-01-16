import { useState } from "react";
import "./FreeShippingPopup.css";

const FREE_SHIPPING_FROM = 350000;

export default function FreeShippingPopup({ total, method }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;
  if (method !== "delivery") return null;

  const qualifies = total >= FREE_SHIPPING_FROM;
  const missing = FREE_SHIPPING_FROM - total;

  return (
    <div className="free-shipping-popup">
      <div className="popup-content">
        <button className="popup-close" onClick={() => setVisible(false)}>
          ✕
        </button>

        {qualifies ? (
          <>
            <h4>🎉 ¡Tenés envío gratis!</h4>
            <p>Tu compra supera los ${FREE_SHIPPING_FROM.toLocaleString()}</p>
          </>
        ) : (
          <>
            <h4>🚚 Envío gratis a partir de ${FREE_SHIPPING_FROM.toLocaleString()}</h4>
            <p>
              Te faltan{" "}
              <strong>${missing.toLocaleString()}</strong> para obtenerlo
            </p>
          </>
        )}
      </div>
    </div>
  );
}
