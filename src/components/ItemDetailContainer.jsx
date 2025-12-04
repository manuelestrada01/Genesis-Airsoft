import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import "./ItemDetailContainer.css";
import ItemCount from "./ItemCount";
import { CartContext } from "../context/CartContext";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clearCart, addToCart } = useContext(CartContext);  // ← ✔ correcto

  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const ref = doc(db, "products", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };

          const firstImage =
            data.cover ||
            data.images?.[0]?.imageUrl ||
            data.imageUrl ||
            data.image ||
            "";

          const normalizedProduct = {
            ...data,
            image: firstImage,
            images: data.images || [],
            stock: data.stock ?? 0  // 🔥 IMPORTANTE
          };

          setProduct(normalizedProduct);
          setMainImage(firstImage);
        }
      } catch (err) {
        console.error("Error cargando producto:", err);
      }
    };

    fetchProduct();
  }, [id]);

  if (!product) return <p>Cargando producto...</p>;

  const outOfStock = product.stock === 0;

  const desc = product.description || "";
  const isLong = desc.length > 150;
  const visibleText = showFullDesc ? desc : desc.substring(0, 150);

  const discount = product.discount || 0;
  const hasDiscount = discount > 0;

  const finalPrice = hasDiscount
    ? (product.price - product.price * (discount / 100)).toFixed(2)
    : product.price;

  // ================================
  // 🔥 Comprar ahora
  // ================================
  const handleBuyNow = () => {
    if (outOfStock) return;

    const discount = product.discount || 0;
    const finalPrice = discount > 0
      ? Number((product.price - product.price * (discount / 100)).toFixed(2))
      : product.price;

    const productToCart = {
      ...product,
      price: finalPrice
    };

    clearCart();
    addToCart(productToCart, quantity);
    navigate("/checkout");
  };

  // ================================
  // 🔥 Agregar al carrito
  // ================================
  const handleAddToCart = () => {
    if (outOfStock) return;

    const finalPrice = hasDiscount
      ? Number((product.price - product.price * (discount / 100)).toFixed(2))
      : product.price;

    addToCart({ ...product, price: finalPrice }, quantity);
  };

  return (
    <div className="detail-layout">

      {/* MINIATURAS */}
      <div className="detail-thumbs-column">
        {(product.images?.length ? product.images : [{ imageUrl: mainImage }])
          .map((img, i) => (
            <img
              key={i}
              src={img.imageUrl}
              alt="thumb"
              className={`detail-thumb-img ${
                mainImage === img.imageUrl ? "active" : ""
              }`}
              onClick={() => setMainImage(img.imageUrl)}
            />
          ))}
      </div>

      {/* IMAGEN PRINCIPAL */}
      <div className="detail-main-img-wrapper">
        {hasDiscount && (
          <div className="detail-discount-tag">
            -{discount}%
          </div>
        )}
        <img src={mainImage} alt={product.name} className="detail-main-img" />
      </div>

      {/* INFO */}
      <div className="info-box">
        <h1 className="info-title">{product.name}</h1>
        <p className="info-cat">Categoría: {product.category}</p>

        {/* 🔥 STOCK */}
        {outOfStock ? (
          <p style={{ color: "red", fontWeight: "bold", fontSize: "18px" }}>
            SIN STOCK DISPONIBLE
          </p>
        ) : (
          <p style={{ color: "green", fontWeight: "bold", fontSize: "18px" }}>
            EN STOCK
          </p>
        )}

        {/* PRECIOS */}
        <div className="info-price-box">
          {hasDiscount ? (
            <>
              <p className="info-price-final">${finalPrice}</p>
              <p className="info-price-original">${product.price}</p>
            </>
          ) : (
            <p className="info-price-final">${product.price}</p>
          )}
        </div>

        {/* DESCRIPCIÓN */}
        <p className="info-short">
          {visibleText}
          {isLong && !showFullDesc ? "..." : ""}
        </p>

        {isLong && (
          <button
            className="info-read-more"
            onClick={() => setShowFullDesc(!showFullDesc)}
          >
            {showFullDesc ? "Leer menos" : "Leer más"}
          </button>
        )}

        {/* CANTIDAD */}
        {!outOfStock && (
          <div className="info-qty-box">
            <label>Cantidad *</label>
            <ItemCount
              product={product}
              onQuantityChange={setQuantity}
              stock={product.stock}
            />
          </div>
        )}

        {/* COMPRA DIRECTa */}
        <button
          className="btn-buy"
          onClick={handleBuyNow}
          disabled={outOfStock}
          style={{
            opacity: outOfStock ? 0.5 : 1,
            cursor: outOfStock ? "not-allowed" : "pointer"
          }}
        >
          {outOfStock ? "Sin stock" : "Realizar compra"}
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
