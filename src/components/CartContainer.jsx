// src/components/CartContainer.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import "./CartContainer.css";

function CartContainer() {
  const { cart, removeFromCart, clearCart, totalPrice } = useContext(CartContext);
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="cart-container">
        <h2>🛒 Carrito de Compras</h2>
        <p>No hay productos en el carrito.</p>
        <button className="checkout-btn" onClick={() => navigate("/")}>
          Volver al Catálogo
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>🛒 Carrito de Compras</h2>

      {cart.map((item) => (
        <div key={item.id} className="cart-item">
          <div className="cart-item-info">
            <img src={item.image} alt={item.name} className="cart-item-img" />
            <div>
              <h4>{item.name}</h4>
              <p>Cantidad: {item.quantity}</p>
              <p>Precio unitario: ${item.price}</p>
            </div>
          </div>

          <div className="cart-item-actions">
            <strong>Subtotal: ${item.price * item.quantity}</strong>
            <button
              className="remove-btn"
              onClick={() => removeFromCart(item.id)}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}

      <div className="cart-total">
        <h3>Total: ${totalPrice}</h3>

        <div className="cart-buttons">
          <button className="clear-btn" onClick={clearCart}>
            Vaciar carrito
          </button>
          <button className="checkout-btn" onClick={() => navigate("/checkout")}>
            Ir al Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

export default CartContainer;
