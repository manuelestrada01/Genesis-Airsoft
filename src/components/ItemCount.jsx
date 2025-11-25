import React, { useState, useContext, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import "./ItemCount.css";

const ItemCount = ({ stock = 10, initial = 1, product, onQuantityChange }) => {
  const [quantity, setQuantity] = useState(initial);
  const [added, setAdded] = useState(false); 
  const { addToCart } = useContext(CartContext);

  // Notifica al padre cada vez que cambia
  useEffect(() => {
    if (onQuantityChange) onQuantityChange(quantity);
  }, [quantity]);

  const increase = () =>
    setQuantity((prev) => (prev < stock ? prev + 1 : prev));

  const decrease = () =>
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    addToCart(product, quantity);

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="count-row">

      <div className="count-box">
        <button className="count-btn" onClick={decrease}>−</button>
        <span className="count-number">{quantity}</span>
        <button className="count-btn" onClick={increase}>+</button>
      </div>

      <button
        className={`count-add-btn ${added ? "added" : ""}`}
        onClick={handleAddToCart}
        disabled={added}
      >
        {added ? "✔ Agregado" : "Agregar al carrito"}
      </button>

    </div>
  );
};

export default ItemCount;
