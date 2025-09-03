import React from "react";
import "./ProductCard.css";
import { FaShoppingCart } from "react-icons/fa"; // Ícono carrito

const ProductCard = ({ name, price, image, category }) => {
  return (
    <div className="product-card">
      <img src={image} alt={name} className="product-img" />

      <div className="product-info">
        <p className="product-title">{name}</p>
        <p className="product-category">{category}</p> {/* 👈 Nueva línea */}
        <p className="product-price">{price}</p>
      </div>

      <button className="add-to-cart">
        <span className="btn-text">Agregar al carrito</span>
        <FaShoppingCart className="btn-icon" />
      </button>
    </div>
  );
};

export default ProductCard;
