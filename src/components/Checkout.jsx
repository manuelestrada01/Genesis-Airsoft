import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckoutContext } from "../context/CheckoutContext";
import { CartContext } from "../context/CartContext";
import AuthContext from "../context/AuthContext";
import "./Checkout.css";

const provincesAR = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
  "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

function Checkout() {
  const { cart, totalPrice } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const { buyer, handleBuyerChange, completeCheckout, orderId, loading, error, success } =
    useContext(CheckoutContext);

  const [processingPayment, setProcessingPayment] = useState(false);
  const [errors, setErrors] = useState({});
  const orderIdRef = useRef(orderId);
  const isLogged = !!user;

  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);

  useEffect(() => {
    if (!isLogged) return;
    if (!buyer.name && user.displayName) {
      handleBuyerChange({ target: { name: "name", value: user.displayName } });
    }
    if (!buyer.email && user.email) {
      handleBuyerChange({ target: { name: "email", value: user.email } });
    }
  }, [isLogged]);

  const form = useMemo(
    () => ({
      name: buyer.name || "",
      email: buyer.email || "",
      phone: buyer.phone || "",
      method: buyer.method || "delivery",
      street: buyer.street || "",
      number: buyer.number || "",
      city: buyer.city || "",
      province: buyer.province || "",
      zip: buyer.zip || "",
      notes: buyer.notes || "",
    }),
    [buyer]
  );

  const onChange = (e) => handleBuyerChange(e);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Ingresá tu nombre completo.";
    if (!form.email.trim()) next.email = "Ingresá tu e-mail.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "E-mail inválido.";
    if (!form.phone.trim()) next.phone = "Ingresá un teléfono.";

    if (form.method === "delivery") {
      if (!form.street.trim()) next.street = "Calle requerida.";
      if (!form.number.trim()) next.number = "Altura requerida.";
      if (!form.city.trim()) next.city = "Ciudad requerida.";
      if (!form.province.trim()) next.province = "Provincia requerida.";
      if (!form.zip.trim()) next.zip = "Código postal requerido.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // Cálculo de descuento
  const calculateDiscountedPrice = (price, discount) => {
    return discount ? (price - price * (discount / 100)).toFixed(2) : price;
  };

    const handlePayment = async (e) => {
      e.preventDefault();
      if (!validate()) return;

      try {
        setProcessingPayment(true);

        // 1) Crear orden segura + preferencia MP
        const response = await fetch(
          "https://us-central1-genesis-airsoft.cloudfunctions.net/createSecureOrder",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.uid,
              buyer: form,
              items: cart.map(item => ({
                id: item.id,
                quantity: item.quantity
              }))
            })
          }
        );

        const data = await response.json();

        if (!data.preferenceId) {
          alert("❌ Error creando la preferencia segura.");
          return;
        }

    // 2) Redirigir al checkout de Mercado Pago
    window.location.href =
      `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${data.preferenceId}`;

  } catch (err) {
    console.error("❌ Error en el pago:", err);
    alert("Ocurrió un error al procesar el pago.");
  } finally {
    setProcessingPayment(false);
  }
};



  return (
    <div className="checkout-wrapper">
      {/* Columna izquierda */}
      <div className="checkout-left">
        <h2>Detalles de facturación</h2>
        <form onSubmit={handlePayment} className="checkout-form">
          <div className="grid-2">
            <Input label="Nombre*" name="name" value={form.name} onChange={onChange} error={errors.name} />
            <Input label="Correo electrónico*" name="email" value={form.email} onChange={onChange} error={errors.email} />
          </div>
          <Input label="Teléfono*" name="phone" value={form.phone} onChange={onChange} error={errors.phone} />
          <div className="radio-group">
            <label className="radio-label">
              <input type="radio" name="method" value="delivery" checked={form.method === "delivery"} onChange={onChange} />
              Envío a domicilio
            </label>
            <label className="radio-label">
              <input type="radio" name="method" value="pickup" checked={form.method === "pickup"} onChange={onChange} />
              Retiro en tienda (sin costo)
            </label>
          </div>

          {form.method === "delivery" ? (
            <>
              <Input label="Calle*" name="street" value={form.street} onChange={onChange} error={errors.street} />
              <div className="grid-3">
                <Input label="Altura*" name="number" value={form.number} onChange={onChange} error={errors.number} />
                <Input label="Ciudad*" name="city" value={form.city} onChange={onChange} error={errors.city} />
                <Input label="CP*" name="zip" value={form.zip} onChange={onChange} error={errors.zip} />
              </div>
              <Select label="Provincia*" name="province" value={form.province} onChange={onChange} options={provincesAR} error={errors.province} />
            </>
          ) : (
            <div className="pickup-info">
              <strong>Retiro en tienda:</strong> Av. Siempre Viva 123, CABA.
            </div>
          )}

          <textarea
            name="notes"
            className="checkout-textarea"
            value={form.notes}
            onChange={onChange}
            placeholder="Indicaciones adicionales para el envío o retiro"
          />
        </form>
      </div>

      {/* Columna derecha: Resumen */}
      <div className="checkout-right">
        <h3>Tu pedido</h3>
        <div className="order-summary">
          {cart.map((item) => (
            <div key={item.name} className="order-item">
              <span>{item.name} × {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <hr />
          <div className="order-line"><strong>Subtotal</strong><span>${totalPrice.toFixed(2)}</span></div>
          <div className="order-line"><strong>Envío</strong><span>{form.method === "pickup" ? "Retiro en tienda" : "A cotizar"}</span></div>
          <div className="order-line total"><strong>Total</strong><span>${totalPrice.toFixed(2)}</span></div>
        </div>

        <button
          type="submit"
          onClick={handlePayment}
          className="checkout-button"
          disabled={loading || processingPayment}
        >
          {loading || processingPayment ? "Procesando..." : "Realizar pedido"}
        </button>

        {error && <p className="checkout-error">{error}</p>}
      </div>
    </div>
  );
}

/* === SUBCOMPONENTES === */
function Input({ label, error, ...rest }) {
  return (
    <div>
      <label className="checkout-label">{label}</label>
      <input {...rest} className={`checkout-input ${error ? "error" : ""}`} />
      {error && <span className="checkout-error">{error}</span>}
    </div>
  );
}

function Select({ label, options, error, ...rest }) {
  return (
    <div>
      <label className="checkout-label">{label}</label>
      <select {...rest} className={`checkout-select ${error ? "error" : ""}`}>
        <option value="">Seleccioná…</option>
        {options.map((op) => (
          <option key={op} value={op}>{op}</option>
        ))}
      </select>
      {error && <span className="checkout-error">{error}</span>}
    </div>
  );
}

export default Checkout;
