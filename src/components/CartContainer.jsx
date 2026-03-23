// src/components/CartContainer.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import "./CartContainer.css";

const FREE_SHIPPING_FROM = 350_000;
const SHIPPING_COST = 16_000;

const fmt = (n) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function CartContainer() {
  const { cart, removeFromCart, clearCart, totalPrice, updateQuantity } =
    useContext(CartContext);
  const navigate = useNavigate();

  const shipping = totalPrice >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
  const grandTotal = totalPrice + shipping;

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <div className="cart-empty-icon">🛒</div>
        <h2>Tu carrito está vacío</h2>
        <p>Agregá productos para comenzar tu compra.</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Ver catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="cart-wrapper">
      <h1 className="cart-title">Carrito de compras</h1>

      <div className="cart-layout">
        {/* ITEMS */}
        <div className="cart-items-panel">
          <div className="cart-items-header">
            <span>{cart.length} {cart.length === 1 ? "producto" : "productos"}</span>
            <button className="btn-clear" onClick={clearCart}>
              Vaciar carrito
            </button>
          </div>

          <ul className="cart-list">
            {cart.map((item) => (
              <li key={item.id} className="cart-item">
                <div className="cart-item-img-wrap">
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                </div>

                <div className="cart-item-body">
                  <h4 className="cart-item-name">{item.name}</h4>
                  <p className="cart-item-unit">Precio unitario: {fmt(item.price)}</p>

                  <div className="cart-item-bottom">
                    <div className="qty-control">
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        −
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    <span className="cart-item-subtotal">
                      {fmt(item.price * item.quantity)}
                    </span>

                    <button
                      className="btn-remove"
                      onClick={() => removeFromCart(item.id)}
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* RESUMEN */}
        <aside className="cart-summary">
          <h3 className="summary-title">Resumen del pedido</h3>

          <div className="summary-rows">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{fmt(totalPrice)}</span>
            </div>

            <div className="summary-row">
              <span>Envío</span>
              {shipping === 0 ? (
                <span className="shipping-free">Gratis</span>
              ) : (
                <span>{fmt(shipping)}</span>
              )}
            </div>

            {shipping > 0 && (
              <p className="shipping-hint">
                Agregá {fmt(FREE_SHIPPING_FROM - totalPrice)} más para envío gratis
              </p>
            )}

            <div className="summary-divider" />

            <div className="summary-row total-row">
              <span>Total</span>
              <span>{fmt(grandTotal)}</span>
            </div>
          </div>

          <button
            className="btn-checkout"
            onClick={() => navigate("/checkout")}
          >
            Ir al checkout
          </button>

          <button className="btn-back" onClick={() => navigate("/")}>
            Seguir comprando
          </button>
        </aside>
      </div>
    </div>
  );
}

export default CartContainer;
