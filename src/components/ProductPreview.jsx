import React from "react";
import "./ProductPreview.css";
import ItemCount from "./ItemCount"; // ✅ contador reutilizable con lógica del carrito

const ProductPreview = ({ product, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <span className="close" onClick={onClose}>&times;</span>

        <div className="modal-body">
          {/* Imagen del producto */}
          <img src={product.image} alt={product.name} />

          {/* Detalles */}
          <div className="modal-details">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
            <p className="price">${product.price}</p>

            {/* 👇 Reutilizamos el contador (ya incluye el botón "Agregar al carrito") */}
            <ItemCount product={product} initial={1} stock={10} />

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
