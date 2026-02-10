import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckoutContext } from "../context/CheckoutContext";
import { CartContext } from "../context/CartContext";
import AuthContext from "../context/AuthContext";
import "./Checkout.css";
import FreeShippingPopup from "../components/FreeShippingPopup";

const FREE_SHIPPING_FROM = 350000;
const SHIPPING_COST = 16000; // ✅ corregido (antes 1)

const provincesAR = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
  "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

function Checkout() {
  const navigate = useNavigate();

  const { cart, totalPrice } = useContext(CartContext);
  const { buyer, handleBuyerChange, loading, error } = useContext(CheckoutContext);
  const { user } = useContext(AuthContext);

  const [processingPayment, setProcessingPayment] = useState(false);
  const [errors, setErrors] = useState({});

  // ✅ NUEVO: método de pago
  const [paymentMethod, setPaymentMethod] = useState("mercadopago"); // "mercadopago" | "bank_transfer"

  // ✅ NUEVO: para mostrar instrucciones de transferencia sin salir del checkout
  const [transferInfo, setTransferInfo] = useState(null); // { orderId, instructions, expiresInHours, totalWithShipping, shipping }

  // =========================
  // FORM NORMALIZADO
  // =========================
  const form = useMemo(
    () => ({
      name: buyer.name || "",
      email: buyer.email || "",
      phone: buyer.phone || "",
      dni: buyer.dni || "",
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

  // =========================
  // VALIDACIONES
  // =========================
  const validate = () => {
    const next = {};

    if (!form.name.trim()) next.name = "Ingresá tu nombre.";
    if (!form.email.trim()) next.email = "Ingresá tu email.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Email inválido.";
    if (!form.phone.trim()) next.phone = "Ingresá un teléfono.";
    if (!form.dni.trim()) next.dni = "Ingresá tu DNI.";
    if (!/^\d{7,9}$/.test(form.dni)) next.dni = "DNI inválido.";

    if (form.method === "delivery") {
      if (!form.street.trim()) next.street = "Calle requerida.";
      if (!form.number.trim()) next.number = "Altura requerida.";
      if (!form.city.trim()) next.city = "Ciudad requerida.";
      if (!form.province.trim()) next.province = "Provincia requerida.";
      if (!form.zip.trim()) next.zip = "CP requerido.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // =========================
  // PAGO
  // =========================
  const handlePayment = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!user?.uid) {
      alert("Tenés que iniciar sesión para continuar.");
      navigate("/auth");
      return;
    }

    try {
      setProcessingPayment(true);
      setTransferInfo(null);

      const res = await fetch(
        "https://us-central1-genesis-airsoft.cloudfunctions.net/createSecureOrder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            paymentMethod: paymentMethod, // ✅ NUEVO
            buyer: form,
            items: cart.map((i) => ({
              id: i.id,
              quantity: i.quantity,
            })),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error creando la orden.");
        return;
      }

      // =========================
      // ✅ Mercado Pago (flujo actual)
      // =========================
      if (paymentMethod === "mercadopago") {
        if (!data.preferenceId) {
          alert("Error creando la preferencia de pago.");
          return;
        }

        window.location.href =
          `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${data.preferenceId}`;
        return;
      }

      // =========================
      // ✅ Transferencia (NO redirect)
      // =========================
      if (paymentMethod === "bank_transfer") {
        if (!data.orderId) {
          alert("No se pudo crear el pedido por transferencia.");
          return;
        }

        setTransferInfo({
          orderId: data.orderId,
          instructions: data.transferInstructions || null,
          expiresInHours: data.expiresInHours || 48,
          totalWithShipping: data.totalWithShipping,
          shipping: data.shipping,
          subtotal: data.subtotal,
        });

        // opcional: scrollear arriba del panel derecho
        return;
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pago.");
    } finally {
      setProcessingPayment(false);
    }
  };

  // =========================
  // CALCULOS (preview UI)
  // =========================
  const shippingCost =
    form.method === "delivery" && totalPrice < FREE_SHIPPING_FROM
      ? SHIPPING_COST
      : 0;

  const totalFinal = totalPrice + shippingCost;

  const isTransfer = paymentMethod === "bank_transfer";

  // =========================
  // RENDER
  // =========================
  return (
    <div className="checkout-wrapper">
      {/* COLUMNA IZQUIERDA */}
      <div className="checkout-left">
        <h2 className="checkout-title">Finalizar compra</h2>
        <p className="checkout-subtitle">
          Completá tus datos para continuar con el pago
        </p>

        <form onSubmit={handlePayment} className="checkout-form">
          <section className="checkout-section">
            <h4>Datos personales</h4>

            <div className="grid-2">
              <Input label="Nombre*" name="name" value={form.name} onChange={onChange} error={errors.name} />
              <Input label="Email*" name="email" value={form.email} onChange={onChange} error={errors.email} />
            </div>

            <div className="grid-2">
              <Input label="Teléfono*" name="phone" value={form.phone} onChange={onChange} error={errors.phone} />
              <Input label="DNI*" name="dni" value={form.dni} onChange={onChange} error={errors.dni} />
            </div>
          </section>

          <section className="checkout-section">
            <h4>Método de entrega</h4>

            <div className="radio-group pills">
              <label className={form.method === "delivery" ? "active" : ""}>
                <input
                  type="radio"
                  name="method"
                  value="delivery"
                  checked={form.method === "delivery"}
                  onChange={onChange}
                />
                Envío a domicilio
              </label>

              <label className={form.method === "pickup" ? "active" : ""}>
                <input
                  type="radio"
                  name="method"
                  value="pickup"
                  checked={form.method === "pickup"}
                  onChange={onChange}
                />
                Retiro en tienda
              </label>
            </div>
          </section>

          {/* ✅ NUEVO: método de pago */}
          <section className="checkout-section">
            <h4>Método de pago</h4>

            <div className="radio-group pills">
              <label className={paymentMethod === "mercadopago" ? "active" : ""}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mercadopago"
                  checked={paymentMethod === "mercadopago"}
                  onChange={() => {
                    setPaymentMethod("mercadopago");
                    setTransferInfo(null);
                  }}
                />
                Mercado Pago
              </label>

              <label className={paymentMethod === "bank_transfer" ? "active" : ""}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === "bank_transfer"}
                  onChange={() => {
                    setPaymentMethod("bank_transfer");
                    setTransferInfo(null);
                  }}
                />
                Transferencia <span style={{ fontWeight: 800 }}>-20%</span>
              </label>
            </div>

            <p style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
              {isTransfer
                ? "El total final por transferencia se calcula en el backend (precio autoritativo)."
                : "Vas a ser redirigido a Mercado Pago para completar el pago."}
            </p>
          </section>

          <div className={`delivery-animated ${form.method === "delivery" ? "show" : "hide"}`}>
            <section className="checkout-section">
              <h4>Dirección de envío</h4>

              <Input
                label="Calle*"
                name="street"
                value={form.street}
                onChange={onChange}
                error={errors.street}
              />

              <div className="grid-3">
                <Input label="Altura*" name="number" value={form.number} onChange={onChange} error={errors.number} />
                <Input label="Ciudad*" name="city" value={form.city} onChange={onChange} error={errors.city} />
                <Input label="CP*" name="zip" value={form.zip} onChange={onChange} error={errors.zip} />
              </div>

              <Select
                label="Provincia*"
                name="province"
                value={form.province}
                onChange={onChange}
                options={provincesAR}
                error={errors.province}
              />

              <div className="checkout-notes">
                <label>Indicaciones para el envío (opcional)</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={onChange}
                  placeholder="Ej: tocar timbre, llamar antes de entregar, dejar en portería, etc."
                  rows={3}
                />
              </div>
            </section>
          </div>
        </form>
      </div>

      {/* COLUMNA DERECHA */}
      <div className="checkout-right sticky">
        <h3>Resumen del pedido</h3>

        <div className="order-items">
          {cart.map((i) => (
            <div key={i.id} className="order-item">
              <span>{i.name} × {i.quantity}</span>
              <span>${(i.price * i.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="order-totals">
          <div className="order-line">
            <span>Subtotal</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>

          <div className="order-line">
            <span>Envío</span>
            <span>
              {form.method === "pickup"
                ? "Retiro en tienda"
                : shippingCost === 0
                  ? "Gratis"
                  : `$${SHIPPING_COST.toLocaleString("es-AR")}`}
            </span>
          </div>

          <div className="order-line total">
            <span>Total (estimado)</span>
            <span>${totalFinal.toFixed(2)}</span>
          </div>

          {transferInfo?.totalWithShipping != null && (
            <div className="order-line total" style={{ marginTop: 6 }}>
              <span>Total (backend)</span>
              <span>${Number(transferInfo.totalWithShipping).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* ✅ Botón principal */}
        <button
          className="checkout-button"
          onClick={handlePayment}
          disabled={processingPayment || loading}
        >
          {processingPayment
            ? "Procesando..."
            : paymentMethod === "mercadopago"
              ? "Pagar con Mercado Pago"
              : "Crear pedido por transferencia"}
        </button>

        {/* ✅ Panel de transferencia */}
        {paymentMethod === "bank_transfer" && transferInfo?.orderId && (
          <div style={{ marginTop: 14, padding: 14, border: "1px solid #ddd", borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Instrucciones de transferencia</h4>

            <p style={{ margin: "8px 0" }}>
              <strong>Pedido:</strong> {transferInfo.orderId}
            </p>

            <p style={{ margin: "8px 0" }}>
              Tenés <strong>{transferInfo.expiresInHours} horas</strong> para transferir y luego subir el comprobante.
            </p>

            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div><strong>Banco:</strong> {transferInfo.instructions?.bank || "—"}</div>
              <div><strong>Alias:</strong> {transferInfo.instructions?.alias || "—"}</div>
              <div><strong>CVU:</strong> {transferInfo.instructions?.cvu || "—"}</div>
              <div><strong>Titular:</strong> {transferInfo.instructions?.holder || "—"}</div>
            </div>

            <button
              type="button"
              style={{ marginTop: 12, width: "100%" }}
              className="checkout-button"
              onClick={() => navigate(`/order/${transferInfo.orderId}`)}
            >
              Ir al detalle del pedido
            </button>
          </div>
        )}

        {error && <p className="checkout-error">{error}</p>}
      </div>

      <FreeShippingPopup total={totalPrice} method={form.method} />
    </div>
  );
}

/* SUBCOMPONENTES */
function Input({ label, error, ...rest }) {
  return (
    <div>
      <label>{label}</label>
      <input {...rest} className={error ? "error" : ""} />
      {error && <span className="checkout-error">{error}</span>}
    </div>
  );
}

function Select({ label, options, error, ...rest }) {
  return (
    <div>
      <label>{label}</label>
      <select {...rest} className={error ? "error" : ""}>
        <option value="">Seleccioná…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {error && <span className="checkout-error">{error}</span>}
    </div>
  );
}

export default Checkout;
