import React, { useState } from "react";
import "./ProductCard.css";
import { FaShoppingCart, FaSearch } from "react-icons/fa"; 
import ProductPreview from "./ProductPreview";

const ProductCard = ({ name, price, image, category, description }) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div className="product-card">
        {/* Imagen del producto */}
        <img src={image} alt={name} className="product-img" />

        {/* Botón lupa (aparece en hover) */}
        <button
          className="quick-view-btn"
          onClick={() => setShowPreview(true)}
        >
          <FaSearch />
        </button>

        {/* Info del producto */}
        <div className="product-info">
          <p className="product-title">{name}</p>
          <p className="product-category">{category}</p>
          <p className="product-price">${price}</p>
        </div>

        {/* Botón agregar al carrito */}
        <button className="add-to-cart">
          <span className="btn-text">Agregar al carrito</span>
          <FaShoppingCart className="btn-icon" />
        </button>
      </div>

      {/* Modal Preview */}
      {showPreview && (
        <ProductPreview
          product={{ name, price, image, category, description }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
