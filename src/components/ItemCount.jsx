import React, { useState, useContext } from "react";
import { CartContext } from "../context/CartContext";
import "./ProductPreview.css";

const ItemCount = ({ stock = 10, initial = 1, product }) => {
  const [quantity, setQuantity] = useState(initial);
  const [added, setAdded] = useState(false); // 👈 Nuevo estado
  const { addToCart } = useContext(CartContext);

  const increase = () => setQuantity(prev => (prev < stock ? prev + 1 : prev));
  const decrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true); // 👈 Oculta el selector luego de agregar
  };

  return (
    <div className="modal-actions">
      {!added ? (
        <>
          <div className="quantity-selector">
            <button onClick={decrease}>-</button>
            <span>{quantity}</span>
            <button onClick={increase}>+</button>
          </div>

          <button className="add-cart-btn" onClick={handleAddToCart}>
            Agregar al carrito
          </button>
        </>
      ) : (
        <div className="after-add">
          <p>Producto agregado ✅</p>
          <button onClick={() => setAdded(false)}>Seguir comprando</button>
          {/* O podrías agregar un enlace a tu carrito */}
          {/* <Link to="/cart">Ver carrito</Link> */}
        </div>
      )}
    </div>
  );
};

export default ItemCount;
