import React, { useState, useContext } from "react";
import "./ProductCard.css";
import { FaShoppingCart, FaSearch } from "react-icons/fa"; 
import ProductPreview from "./ProductPreview";
import { Link } from "react-router-dom"; 
import { CartContext } from "../context/CartContext";

const ProductCard = ({ id, name, price, image, category, description }) => {
  const [showPreview, setShowPreview] = useState(false);
  const { addToCart } = useContext(CartContext); // 🔹 extraemos función del context

  const handleAddToCart = () => {
    addToCart({ id, name, price, image, category, description }, 1); // siempre 1 unidad
  };

  return (
    <>
      <div className="product-card">
        <Link to={`/product/${id}`}>
          <img src={image} alt={name} className="product-img" />
        </Link>

        <button
          className="quick-view-btn"
          onClick={() => setShowPreview(true)}
        >
          <FaSearch />
        </button>

        <div className="product-info">
          <Link to={`/product/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <p className="product-title">{name}</p>
          </Link>
          <p className="product-category">{category}</p>
          <p className="product-price">${price}</p>
        </div>

        {/* Botón agregar al carrito */}
        <button className="add-to-cart" onClick={handleAddToCart}>
          <span className="btn-text">Agregar al carrito</span>
          <FaShoppingCart className="btn-icon" />
        </button>
      </div>

      {showPreview && (
        <ProductPreview
          product={{ id, name, price, image, category, description }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
