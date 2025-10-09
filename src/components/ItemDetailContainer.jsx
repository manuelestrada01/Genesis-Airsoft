// src/components/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/db";
import "./ItemDetailContainer.css";
import ItemCount from "./ItemCount";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

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

        {/* 👇 solo pasamos el producto */}
        <ItemCount product={product} />
      </div>
    </div>
  );
};

export default ProductDetail;
