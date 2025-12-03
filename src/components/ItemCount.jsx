import React, { useState, useContext, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import "./ItemCount.css";

const ItemCount = ({ stock = 0, initial = 1, product, onQuantityChange }) => {
  // 🔥 Si initial > stock → corregimos
  const safeInitial = stock > 0 ? Math.min(initial, stock) : 1;

  const [quantity, setQuantity] = useState(safeInitial);
  const [added, setAdded] = useState(false);
  const { addToCart } = useContext(CartContext);

  const outOfStock = stock === 0;

  // Notificar cambio de cantidad al padre
  useEffect(() => {
    if (onQuantityChange) onQuantityChange(quantity);
  }, [quantity]);

  const increase = () => {
    if (outOfStock) return;
    setQuantity((prev) => (prev < stock ? prev + 1 : prev));
  };

  const decrease = () => {
    if (outOfStock) return;
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddToCart = () => {
    if (outOfStock) return;

    const priceToUse = product.finalPrice ?? product.price;

    const productForCart = {
      ...product,
      price: Number(priceToUse),
    };

    addToCart(productForCart, quantity);

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="count-row">

      {/* ----------- CONTADOR ----------- */}
      <div className="count-box">
        <button
          className="count-btn"
          onClick={decrease}
          disabled={outOfStock}
          style={{
            opacity: outOfStock ? 0.4 : 1,
            cursor: outOfStock ? "not-allowed" : "pointer"
          }}
        >
          −
        </button>

        <span className="count-number">{outOfStock ? 0 : quantity}</span>

        <button
          className="count-btn"
          onClick={increase}
          disabled={outOfStock}
          style={{
            opacity: outOfStock ? 0.4 : 1,
            cursor: outOfStock ? "not-allowed" : "pointer"
          }}
        >
          +
        </button>
      </div>

      {/* ----------- BOTÓN AGREGAR ----------- */}
      <button
        className={`count-add-btn ${added ? "added" : ""}`}
        onClick={handleAddToCart}
        disabled={added || outOfStock}
        style={{
          opacity: outOfStock ? 0.5 : 1,
          cursor: outOfStock ? "not-allowed" : "pointer"
        }}
      >
        {outOfStock ? "Sin stock" : added ? "✔ Agregado" : "Agregar al carrito"}
      </button>

    </div>
  );
};

export default ItemCount;
