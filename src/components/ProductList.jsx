import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import trinitymk3 from "../assets/Capturatrinity.png";
import ak74C from "../assets/ak74C.png";
import atak from "../assets/atak.png";
import ar15 from "../assets/ar15.png";
import scar from "../assets/scar.jpg";
import { db } from "../firebase.js";
import { collection, getDocs } from "firebase/firestore";
import "./ProductList.css";

const hardcodedProducts = [
  { id: 1, name: "Arcturus Trinity MK3", price: "1100000", image: trinitymk3, category: "Rifle Eléctrico" },
  { id: 2, name: "Arcturus AK74 Custom", price: "770000", image: ak74C, category: "Rifle Eléctrico" },
  { id: 3, name: "ATAK", price: "800000", image: atak, category: "Pistola GBB" },
  { id: 4, name: "AR15", price: "540000", image: ar15, category: "Rifle Eléctrico" },
  { id: 5, name: "scar", price: "1300", image: scar, category: "Rifle Eléctrico" },
];

const ProductList = () => {
  const [firebaseProducts, setFirebaseProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsFromDb = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFirebaseProducts(productsFromDb);
      } catch (error) {
        console.error("Error al traer productos desde Firebase:", error);
      }
    };

    fetchProducts();
  }, []);

  // Combinar hardcodeados con los traídos de Firebase
  const allProducts = [...hardcodedProducts, ...firebaseProducts];

  return (
    <div className="product-list">
      {allProducts.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
};

export default ProductList;
