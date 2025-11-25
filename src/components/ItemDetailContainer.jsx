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
  const [quantity, setQuantity] = useState(1); // 🔥 Cantidad del ItemCount

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

  // 🔥 COMPRA DIRECTA
  const handleBuyNow = () => {
    clearCart(); // limpia el carrito para compra directa
    addToCart(product, quantity); // añade SOLO este producto con la cantidad seleccionada
    navigate("/checkout"); // redirige al checkout
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
        <img src={mainImage} alt={product.name} className="detail-main-img" />
      </div>

      {/* INFORMACION */}
      <div className="info-box">
        <h1 className="info-title">{product.name}</h1>
        <p className="info-cat">Categoría: {product.category}</p>

        <p className="info-price">${product.price}</p>

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
          <ItemCount
            product={product}
            onQuantityChange={setQuantity} // 🔥 recibimos la cantidad aquí
          />
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
