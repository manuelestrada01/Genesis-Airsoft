import React, { useState, useContext } from "react";
import "./ProductCard.css";
import { FaShoppingCart, FaSearch } from "react-icons/fa";
import ProductPreview from "./ProductPreview";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";

const ProductCard = ({
  id,
  name,
  price,
  finalPrice,
  discount,
  category,
  description,
  image,
  imageUrl,
  images,
  cover,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const { addToCart } = useContext(CartContext);

  // Imágenes universales
  const finalImage =
    cover || imageUrl || image || images?.[0]?.imageUrl || "";

  const handleAddToCart = () => {
    addToCart(
      {
        id,
        name,
        price: finalPrice || price, // precio real a cobrar
        image: finalImage,
        category,
        description,
        images,
      },
      1
    );
  };

  return (
    <>
      <div className="product-card">

        {/* 🔥 BADGE DE DESCUENTO */}
        {discount > 0 && (
          <div className="discount-badge">
            -{discount}%
          </div>
        )}

        {/* Imagen clickeable */}
        <Link to={`/product/${id}`}>
          <img
            src={finalImage}
            alt={name}
            className="product-img"
            onError={(e) => (e.target.src = "/placeholder.jpg")}
          />
        </Link>

        {/* Botón Quick View */}
        <button className="quick-view-btn" onClick={() => setShowPreview(true)}>
          <FaSearch />
        </button>

        <div className="product-info">
          <Link
            to={`/product/${id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <p className="product-title">{name}</p>
          </Link>

          <p className="product-category">{category}</p>

          {/* 🔥 PRECIOS CON DESCUENTO */}
          <div className="price-box">
            {discount > 0 ? (
              <>
                <span className="final-price">${finalPrice}</span>
                <span className="old-price">${price}</span>
              </>
            ) : (
              <span className="final-price">${price}</span>
            )}
          </div>
        </div>

        {/* Botón agregar al carrito */}
        <button className="add-to-cart" onClick={handleAddToCart}>
          <span className="btn-text">Agregar al carrito</span>
          <FaShoppingCart className="btn-icon" />
        </button>
      </div>

      {/* Vista rápida */}
      {showPreview && (
        <ProductPreview
          product={{
            id,
            name,
            price,
            finalPrice,
            category,
            description,
            image: finalImage,
            images,
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};

export default ProductCard;
