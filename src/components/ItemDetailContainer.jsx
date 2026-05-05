import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, analytics } from "../firebase/config";
import { logEvent } from "firebase/analytics";
import "./ItemDetailContainer.css";
import ItemCount from "./ItemCount";
import { CartContext } from "../context/CartContext";

const TRANSFER_DISCOUNT = 0.2; // -20%

// Convierte texto plano a HTML. Si ya tiene tags HTML, lo deja igual.
const toHtml = (text) => {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;

  let html = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Bullets → newline + bullet char
  html = html.replace(/\s*[\u00B7\u2022\u2027\u2219\u22C5\u25CF\u25AA\u25E6]\s*/g, "\n\u2022 ");

  // Multiple newlines → single paragraph break (no doble <br />)
  html = html.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />");
  html = "<p>" + html + "</p>";

  return html;
};

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
  const thumbsRef = useRef(null);

  const imageList = product?.images?.length
    ? product.images.map((img) => img.imageUrl)
    : mainImage ? [mainImage] : [];

  const currentIndex = imageList.indexOf(mainImage);

  const goNext = () => {
    if (imageList.length < 2) return;
    const next = (currentIndex + 1) % imageList.length;
    setMainImage(imageList[next]);
  };

  const goPrev = () => {
    if (imageList.length < 2) return;
    const prev = (currentIndex - 1 + imageList.length) % imageList.length;
    setMainImage(imageList[prev]);
  };

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

        const productData = {
          ...data,
          image: firstImage,
          images: data.images || [],
          stock: data.stock ?? 0,
        };
        setProduct(productData);
        setMainImage(firstImage);

        logEvent(analytics, "view_item", {
          currency: "ARS",
          value: data.price || 0,
          items: [{ item_id: snap.id, item_name: data.name, price: data.price || 0, item_category: data.category || "" }],
        });
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
      <div className="paused-container-pro">
        <h2>Producto no disponible</h2>
        <p>Este producto fue temporalmente pausado.</p>
        <button className="paused-back-btn" onClick={() => navigate("/")}>
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
  const hasLongDesc = FULL_DESC.length > 300;

  const handleBuyNow = () => {
    if (outOfStock) return;

    logEvent(analytics, "begin_checkout", {
      currency: "ARS",
      value: finalPriceNumber * quantity,
      items: [{ item_id: product.id, item_name: product.name, price: finalPriceNumber, quantity, item_category: product.category || "" }],
    });

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
      <div className="gallery-thumbs-wrapper">
        <div className="gallery-thumbs-pro" ref={thumbsRef}>
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
        {imageList.length > 6 && (
          <button
            className="thumbs-scroll-btn"
            onClick={() => thumbsRef.current?.scrollBy({ top: 90, behavior: "smooth" })}
          >
            &#8964;
          </button>
        )}
      </div>

      {/* IMAGEN PRINCIPAL */}
      <div className="gallery-main-pro">
        {hasDiscount && <div className="discount-badge-pro">-{discount}%</div>}
        <img src={mainImage} alt={product.name} className="main-img-pro" />
        {imageList.length > 1 && (
          <>
            <button className="gallery-arrow-pro gallery-arrow-pro--prev" onClick={goPrev}>&#8249;</button>
            <button className="gallery-arrow-pro gallery-arrow-pro--next" onClick={goNext}>&#8250;</button>
          </>
        )}
      </div>

      {/* PANEL DE INFO */}
      <div className="info-panel-pro">
        <h1 className="title-pro">{product.name}</h1>
        <p className="category-pro">{product.category}</p>

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

        {/* precio por transferencia */}
        {!outOfStock && (
          <div className="transfer-info-pro">
            <span className="transfer-info-pro__label">Transferencia (-20%)</span>
            <span className="transfer-info-pro__price">${formatARS(transferPriceNumber)}</span>
            <span className="transfer-info-pro__hint">Se confirma en checkout</span>
          </div>
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
        </div>
      </div>

      {/* DESCRIPCIÓN — debajo de la galería */}
      {FULL_DESC && (
        <div className="desc-section-pro">
          <div className="desc-section-pro__header">
            <div className="desc-section-pro__line" />
            <span className="desc-section-pro__label">Descripción</span>
            <div className="desc-section-pro__line" />
          </div>
          <div
            className={`desc-pro html-description${showFullDesc ? " expanded" : ""}`}
            dangerouslySetInnerHTML={{ __html: toHtml(FULL_DESC) }}
          />
          {hasLongDesc && (
            <button
              className="readmore-pro"
              onClick={() => setShowFullDesc(!showFullDesc)}
            >
              {showFullDesc ? "Leer menos" : "Leer más"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
