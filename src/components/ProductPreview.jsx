import React from "react";
import "./ProductPreview.css";
import ItemCount from "./ItemCount";

const ProductPreview = ({ product, onClose }) => {
  // 🔥 Garantizar siempre una imagen válida
  const previewImage =
    product.cover ||
    product.image ||
    product.imageUrl ||
    (product.images && product.images[0]?.imageUrl) ||
    "/placeholder.jpg";

  // 🔥 Calcular descuento correctamente
  const hasDiscount = product.discount > 0;

  const finalPrice = hasDiscount
    ? Number(
        product.finalPrice ||
          product.price - product.price * (product.discount / 100)
      ).toFixed(2)
    : product.price;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>
          &times;
        </span>

        <div className="modal-body">

          {/* IMAGEN */}
          <div className="modal-img-container">
            <img src={previewImage} alt={product.name} />
          </div>

          <div className="modal-details">

            {/* TITULO */}
            <h2>{product.name}</h2>

            {/* DESCUENTO */}
            {hasDiscount && (
              <div className="modal-discount-badge">-{product.discount}%</div>
            )}

            {/* PRECIOS */}
            <div className="modal-price-box">
              {hasDiscount ? (
                <>
                  <span className="modal-final-price">${finalPrice}</span>
                  <span className="modal-old-price">${product.price}</span>
                </>
              ) : (
                <span className="modal-final-price">${product.price}</span>
              )}
            </div>

            {/* ITEM COUNT — 🔥 image siempre incluida */}
            {/* 🔥 ItemCount con stock real */}
              <ItemCount
                product={{
                  ...product,
                  price: product.price,
                  finalPrice: Number(finalPrice),
                  image: previewImage,
                }}
                initial={1}
                stock={product.stock || 0}
              />

              {/* 🔥 Mensaje si no hay stock */}
              {product.stock === 0 && (
                <p className="no-stock-msg">⚠ Producto sin stock disponible</p>
              )}

            {/* DESCRIPCION */}
            <p className="preview-description">
              {product.shortDescription || product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreview;
