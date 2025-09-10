import React, { useState } from "react";
import "./ProductPreview.css";
import { FaShoppingCart } from "react-icons/fa";

const ProductPreview = ({ product, onClose }) => {
  const [quantity, setQuantity] = useState(1);

  const increase = () => setQuantity(prev => prev + 1);
  const decrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>

        <div className="modal-body">
          {/* Imagen */}
          <img src={product.image} alt={product.name} />

          {/* Detalles */}
          <div className="modal-details">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <p className="price">${product.price}</p>

            {/* Contador + Botón juntos */}
            <div className="modal-actions">
              <div className="quantity-selector">
                <button onClick={decrease}>-</button>
                <span>{quantity}</span>
                <button onClick={increase}>+</button>
              </div>

              <button className="add-cart-btn">
                Agregar al carrito
              </button>
            </div>
                        <div className="preview-description">
              {product.shortDescription || product.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreview;
