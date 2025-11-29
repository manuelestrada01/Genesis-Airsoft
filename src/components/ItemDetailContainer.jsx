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
  const { clearCart, addToCart } = useContext(CartContext);

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

          setProduct(data);
          setMainImage(firstImage);
        }
      } catch (err) {
        console.error("Error cargando producto:", err);
      }
    };

    fetchProduct();
  }, [id]);

  if (!product) return <p>Cargando producto...</p>;

  const desc = product.description || "";
  const isLong = desc.length > 150;
  const visibleText = showFullDesc ? desc : desc.substring(0, 150);

  // 🔥 Cálculo del precio con descuento
  const discount = product.discount || 0;
  const hasDiscount = discount > 0;

  const finalPrice = hasDiscount
    ? (product.price - product.price * (discount / 100)).toFixed(2)
    : product.price;

  // 🔥 Comprar ahora
// Comprar ahora con precio con descuento
    const handleBuyNow = () => {

      const discount = product.discount || 0;
      const hasDiscount = discount > 0;

      // 🔥 Precio real del producto
      const finalPrice = hasDiscount
        ? Number((product.price - product.price * (discount / 100)).toFixed(2))
        : product.price;

      const productToCart = {
        ...product,
        price: finalPrice   // ← EL PRECIO QUE ENTRA AL CARRITO
      };

      clearCart();
      addToCart(productToCart, quantity);
      navigate("/checkout");
    };

    const handleAddToCart = () => {

  const discount = product.discount || 0;
  const hasDiscount = discount > 0;

  const finalPrice = hasDiscount
    ? Number((product.price - product.price * (discount / 100)).toFixed(2))
    : product.price;

  const productToCart = {
    ...product,
    price: finalPrice
  };

  addToCart(productToCart, quantity);
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
          <div
            className="detail-discount-tag"
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: "#e60023",
              color: "white",
              padding: "6px 10px",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "14px",
              zIndex: 10
            }}
          >
            -{discount}%
          </div>
        )}

        <img src={mainImage} alt={product.name} className="detail-main-img" />
      </div>

      {/* INFORMACIÓN */}
      <div className="info-box">
        <h1 className="info-title">{product.name}</h1>
        <p className="info-cat">Categoría: {product.category}</p>

        {/* 🔥 PRECIOS */}
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
        <div className="info-qty-box">
          <label>Cantidad *</label>
          <ItemCount product={product} onQuantityChange={setQuantity} />
        </div>

        {/* COMPRA DIRECTA */}
        <button className="btn-buy" onClick={handleBuyNow}>
          Realizar compra
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
