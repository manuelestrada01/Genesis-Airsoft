// src/components/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./ItemDetailContainer.css";

const ProductDetail = () => {
  const { id } = useParams(); // 👈 obtenemos el ID de la URL
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1); // 👈 contador

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.log("Producto no encontrado");
        }
      } catch (error) {
        console.error("Error al obtener producto:", error);
      }
    };

    fetchProduct();
  }, [id]);

  const increase = () => setQuantity(prev => prev + 1);
  const decrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  if (!product) {
    return (
      <p style={{ marginTop: "120px", textAlign: "center" }}>
        Cargando producto...
      </p>
    );
  }

  return (
    <div className="product-detail">
      <img src={product.image} alt={product.name} className="detail-img" />
      <div className="detail-info">
        <h2>{product.name}</h2>
        <p className="detail-category">{product.category}</p>
        <p className="detail-price">${product.price}</p>
        <p className="detail-description">{product.description}</p>

        {/* Contador + Botón */}
        <div className="detail-actions">
          <div className="quantity-selector">
            <button onClick={decrease}>-</button>
            <span>{quantity}</span>
            <button onClick={increase}>+</button>
          </div>

          <button className="detail-add-to-cart">
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
