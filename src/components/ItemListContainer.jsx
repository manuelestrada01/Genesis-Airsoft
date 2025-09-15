import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // 👈 para leer la categoría
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase.js";
import ProductCard from "./ProductCard";
import "./ItemListContainer.css";

const ProductList = () => {
  const { categoryId } = useParams(); // 👈 capturamos la categoría
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let q;
        if (categoryId) {
          q = query(collection(db, "products"), where("category", "==", categoryId));
        } else {
          q = collection(db, "products");
        }

        const querySnapshot = await getDocs(q);
        const productsFromDb = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(productsFromDb);
      } catch (error) {
        console.error("Error al traer productos:", error);
      }
    };

    fetchProducts();
  }, [categoryId]);

  return (
    <div className="product-list">
      {products.length > 0 ? (
        products.map(product => <ProductCard key={product.id} {...product} />)
      ) : (
        <p>No hay productos en esta categoría.</p>
      )}
    </div>
  );
};

export default ProductList;
