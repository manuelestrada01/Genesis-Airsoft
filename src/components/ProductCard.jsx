import React, { useState, useContext } from "react";
import "./ProductCard.css";
import { FaShoppingCart, FaSearch } from "react-icons/fa";
import ProductPreview from "./ProductPreview";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";

const ProductCard = ({ id, name, price, category, description, image, imageUrl, images, cover, tag }) => {

  const [showPreview, setShowPreview] = useState(false);
  const { addToCart } = useContext(CartContext);

  const finalImage =
    cover ||
    imageUrl ||
    image ||
    images?.[0]?.imageUrl ||
    "";

  const handleAddToCart = () => {
    addToCart(
      {
        id,
        name,
        price,
        image: finalImage,
        category,
        description,
        images,
        tag,
      },
      1
    );
  };

  // TAG → texto y color
  const tagLabels = {
    hot: { text: "HOT", color: "#e63946" },
    new: { text: "NUEVO", color: "#000000" },
    sale: { text: "OFERTA", color: "#ff8c00" },
    limited: { text: "LIMITED", color: "#6a4c93" },
  };

  const badge = tag ? tagLabels[tag] : null;

  return (
    <>
      <div className="product-card">

        {/* TAG BADGE */}
        {badge && (
          <span
            className="product-badge"
            style={{ backgroundColor: badge.color }}
          >
            {badge.text}
          </span>
        )}

        <Link to={`/product/${id}`}>
          <img src={finalImage} alt={name} className="product-img" />
        </Link>

        <button className="quick-view-btn" onClick={() => setShowPreview(true)}>
          <FaSearch />
        </button>

        <div className="product-info">
          <Link to={`/product/${id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <p className="product-title">{name}</p>
          </Link>

          <p className="product-category">{category}</p>
          <p className="product-price">${price}</p>
        </div>

        <button className="add-to-cart" onClick={handleAddToCart}>
          <span className="btn-text">Agregar al carrito</span>
          <FaShoppingCart className="btn-icon" />
        </button>
      </div>

      {showPreview && (
        <ProductPreview
          product={{
            id,
            name,
            price,
            category,
            description,
            image: finalImage,
            images,
            tag,
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
