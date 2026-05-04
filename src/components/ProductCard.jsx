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
  stock, // ✅ aseguramos stock
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const { addToCart } = useContext(CartContext);

  // Imagen final a mostrar
  const finalImage =
    cover || imageUrl || image || images?.[0]?.imageUrl || "/placeholder.jpg";

  const handleAddToCart = () => {
    if (stock === 0) return; // 🔥 seguridad adicional

    addToCart(
      {
        id,
        name,
        price: finalPrice || price,
        image: finalImage,
        category,
        description,
        images,
        stock, // pasamos stock al carrito
      },
      1
    );
  };

  return (
    <>
      <div className="product-card">

        {/* IMAGE ZONE — fondo claro intencional */}
        <div className="product-img-wrap">
          {discount > 0 && (
            <div className="discount-badge">-{discount}%</div>
          )}

          <Link to={`/product/${id}`}>
            <img
              src={finalImage}
              alt={name}
              className="product-img"
              onError={(e) => (e.target.src = "/placeholder.jpg")}
            />
          </Link>

          <button className="quick-view-btn" onClick={() => setShowPreview(true)}>
            <FaSearch />
          </button>
        </div>

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

        {/* 🔥 BOTÓN AGREGAR AL CARRITO CON STOCK VALIDADO */}
        <button
          className={`add-to-cart ${stock === 0 ? "disabled" : ""}`}
          onClick={handleAddToCart}
          disabled={stock === 0}
        >
          <span className="btn-text">
            {stock === 0 ? "Sin stock" : "Agregar al carrito"}
          </span>
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
            discount,
            category,
            description,
            stock,         // ✅ IMPORTANT — pasamos stock
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
