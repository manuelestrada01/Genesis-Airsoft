import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import "./ItemDetailContainer.css";
import ItemCount from "./ItemCount";
import { CartContext } from "../context/CartContext";

const TRANSFER_DISCOUNT = 0.2; // -20%

const formatARS = (value) =>
  Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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

        setProduct({
          ...data,
          image: firstImage,
          images: data.images || [],
          stock: data.stock ?? 0,
        });
        setMainImage(firstImage);
      } catch (err) {
        console.error("Error cargando producto:", err);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  // =========================
  // EARLY STATES
  // =========================
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

  // =========================
  // CALCULOS (sin hooks)
  // =========================
  const outOfStock = Number(product.stock || 0) === 0;

  const discount = Number(product.discount || 0);
  const hasDiscount = discount > 0;

  const basePrice = Number(product.price || 0);

  const finalPriceNumber = hasDiscount
    ? Number((basePrice - basePrice * (discount / 100)).toFixed(2))
    : basePrice;

  const transferPriceNumber = Number(
    (finalPriceNumber * (1 - TRANSFER_DISCOUNT)).toFixed(2)
  );

  const FULL_DESC = product.description || "";
  const SHORT_DESC =
    FULL_DESC.length > 300 ? FULL_DESC.slice(0, 300) + "..." : FULL_DESC;

  const handleBuyNow = () => {
    if (outOfStock) return;

    clearCart();
    addToCart({ ...product, price: finalPriceNumber }, quantity);
    navigate("/checkout");
  };

  const handleAddToCart = () => {
    if (outOfStock) return;

    addToCart({ ...product, price: finalPriceNumber }, quantity);
  };

  return (
    <div className="detail-container-pro">
      {/* MINIATURAS */}
      <div className="gallery-thumbs-pro">
        {(product.images?.length ? product.images : [{ imageUrl: mainImage }]).map(
          (img, i) => (
            <img
              key={i}
              src={img.imageUrl}
              className={`thumb-pro ${mainImage === img.imageUrl ? "active" : ""}`}
              onClick={() => setMainImage(img.imageUrl)}
              alt="thumb"
            />
          )
        )}
      </div>

      {/* IMAGEN PRINCIPAL */}
      <div className="gallery-main-pro">
        {hasDiscount && <div className="discount-badge-pro">-{discount}%</div>}
        <img src={mainImage} alt={product.name} className="main-img-pro" />
      </div>

      {/* PANEL DE INFO */}
      <div className="info-panel-pro">
        <h1 className="title-pro">{product.name}</h1>
        <p className="category-pro">Categoría: {product.category}</p>

        <span className={`stock-badge-pro ${outOfStock ? "out" : "in"}`}>
          {outOfStock ? "SIN STOCK" : "EN STOCK"}
        </span>

        <div className="price-box-pro">
          {hasDiscount ? (
            <>
              <span className="price-final-pro">${formatARS(finalPriceNumber)}</span>
              <span className="price-original-pro">${formatARS(basePrice)}</span>
            </>
          ) : (
            <span className="price-final-pro">${formatARS(basePrice)}</span>
          )}
        </div>

        {/* ✅ NUEVO: precio por transferencia (INFO) */}
        {!outOfStock && (
          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              opacity: 0.9,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 800 }}>Transferencia (-20%):</span>
            <span style={{ fontWeight: 900 }}>${formatARS(transferPriceNumber)}</span>
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              (se confirma en checkout)
            </span>
          </div>
        )}

        {/* DESCRIPCIÓN HTML */}
        <div
          className="desc-pro html-description"
          dangerouslySetInnerHTML={{
            __html: showFullDesc ? FULL_DESC : SHORT_DESC,
          }}
        />

        {/* BOTÓN LEER MÁS */}
        {FULL_DESC.length > 300 && (
          <button
            className="readmore-pro"
            onClick={() => setShowFullDesc(!showFullDesc)}
          >
            {showFullDesc ? "Leer menos" : "Leer más"}
          </button>
        )}

        {!outOfStock && (
          <div className="qty-box-pro">
            <label>Cantidad</label>
            <ItemCount
              product={product}
              onQuantityChange={setQuantity}
              stock={product.stock}
            />
          </div>
        )}

        <div className="btns-pro">
          <button className="btn-buy-pro" onClick={handleBuyNow} disabled={outOfStock}>
            Comprar ahora
          </button>

          {/* Si lo usás, dejé la función lista */}
          {/* <button className="btn-cart-pro" onClick={handleAddToCart} disabled={outOfStock}>
            Agregar al carrito
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
