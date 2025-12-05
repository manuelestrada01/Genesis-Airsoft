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

        if (!snap.exists()) {
          navigate("/");
          return;
        }

        const data = { id: snap.id, ...snap.data() };

        // 🔥 Si está pausado → bloquear acceso
        if (data.paused) {
          setProduct({ paused: true });
          return;
        }

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
          stock: data.stock ?? 0,
        };

        setProduct(normalizedProduct);
        setMainImage(firstImage);
      } catch (err) {
        console.error("Error cargando producto:", err);
      }
    };

    fetchProduct();
  }, [id]);

  // ==============================
  // 🔥 Producto pausado
  // ==============================
  if (product?.paused)
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <h2>Producto no disponible</h2>
        <p>Este producto fue temporalmente pausado.</p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: 20,
            padding: "10px 20px",
            background: "#000",
            color: "#fff",
            borderRadius: 6,
          }}
        >
          Volver al inicio
        </button>
      </div>
    );

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

  const handleBuyNow = () => {
    if (outOfStock) return;

    const finalPriceCalc = hasDiscount
      ? Number((product.price - product.price * (discount / 100)).toFixed(2))
      : product.price;

    const productToCart = {
      ...product,
      price: finalPriceCalc,
    };

    clearCart();
    addToCart(productToCart, quantity);
    navigate("/checkout");
  };

  const handleAddToCart = () => {
    if (outOfStock) return;

    const finalPriceCalc = hasDiscount
      ? Number((product.price - product.price * (discount / 100)).toFixed(2))
      : product.price;

    addToCart({ ...product, price: finalPriceCalc }, quantity);
  };

  return (
    <div className="detail-layout">
      <div className="detail-thumbs-column">
        {(product.images?.length ? product.images : [{ imageUrl: mainImage }]).map(
          (img, i) => (
            <img
              key={i}
              src={img.imageUrl}
              alt="thumb"
              className={`detail-thumb-img ${
                mainImage === img.imageUrl ? "active" : ""
              }`}
              onClick={() => setMainImage(img.imageUrl)}
            />
          )
        )}
      </div>

      <div className="detail-main-img-wrapper">
        {hasDiscount && <div className="detail-discount-tag">-{discount}%</div>}
        <img src={mainImage} alt={product.name} className="detail-main-img" />
      </div>

      <div className="info-box">
        <h1 className="info-title">{product.name}</h1>
        <p className="info-cat">Categoría: {product.category}</p>

        {outOfStock ? (
          <p style={{ color: "red", fontWeight: "bold", fontSize: "18px" }}>
            SIN STOCK DISPONIBLE
          </p>
        ) : (
          <p style={{ color: "green", fontWeight: "bold", fontSize: "18px" }}>
            EN STOCK
          </p>
        )}

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

        <button
          className="btn-buy"
          onClick={handleBuyNow}
          disabled={outOfStock}
        >
          {outOfStock ? "Sin stock" : "Realizar compra"}
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
