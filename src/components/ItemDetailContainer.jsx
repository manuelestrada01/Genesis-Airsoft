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
  }, [id]);

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
  const discount = product.discount || 0;
  const hasDiscount = discount > 0;

  const finalPrice = hasDiscount
    ? (product.price - product.price * (discount / 100)).toFixed(2)
    : product.price;

  const FULL_DESC = product.description || "";

  // Crear versión recortada del HTML sin romper etiquetas
  const SHORT_DESC = FULL_DESC.length > 300 ? FULL_DESC.slice(0, 300) + "..." : FULL_DESC;

  const handleBuyNow = () => {
    if (outOfStock) return;

    const finalCalc = hasDiscount
      ? Number(finalPrice)
      : product.price;

    clearCart();
    addToCart({ ...product, price: finalCalc }, quantity);
    navigate("/checkout");
  };

  const handleAddToCart = () => {
    if (outOfStock) return;

    const finalCalc = hasDiscount
      ? Number(finalPrice)
      : product.price;

    addToCart({ ...product, price: finalCalc }, quantity);
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
              <span className="price-final-pro">${finalPrice}</span>
              <span className="price-original-pro">${product.price}</span>
            </>
          ) : (
            <span className="price-final-pro">${product.price}</span>
          )}
        </div>

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
            <ItemCount product={product} onQuantityChange={setQuantity} stock={product.stock} />
          </div>
        )}

        <div className="btns-pro">
          <button className="btn-add-pro" onClick={handleAddToCart} disabled={outOfStock}>
            Agregar al carrito
          </button>

          <button className="btn-buy-pro" onClick={handleBuyNow} disabled={outOfStock}>
            Comprar ahora
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
