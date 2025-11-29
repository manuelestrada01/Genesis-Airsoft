import React, { useState, useContext, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import "./ItemCount.css";

const ItemCount = ({ stock = 10, initial = 1, product, onQuantityChange }) => {
  const [quantity, setQuantity] = useState(initial);
  const [added, setAdded] = useState(false); 
  const { addToCart } = useContext(CartContext);

  // Notifica al padre cada vez que cambia la cantidad
  useEffect(() => {
    if (onQuantityChange) onQuantityChange(quantity);
  }, [quantity]);

  const increase = () =>
    setQuantity((prev) => (prev < stock ? prev + 1 : prev));

  const decrease = () =>
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    // 🔥 Calcular precio final con descuento
    const discount = product.discount || 0;
    const hasDiscount = discount > 0;

    const finalPrice = hasDiscount
      ? Number((product.price - product.price * (discount / 100)).toFixed(2))
      : product.price;

    // 🔥 Crear objeto con precio corregido
    const productForCart = {
      ...product,
      price: finalPrice
    };

    addToCart(productForCart, quantity);

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
