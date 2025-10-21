import React, { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { FiShoppingCart } from "react-icons/fi"; // icono minimalista
import "./CartWidget.css";

const CartWidget = () => {
  const { cart } = useContext(CartContext);
  const navigate = useNavigate();

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleClick = () => {
    navigate("/cart");
  };

  return (
    <button className="cart-widget" onClick={handleClick} aria-label="Ir al carrito">
      <FiShoppingCart className="cart-icon" />
      {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
    </button>
  );
};

export default CartWidget;
