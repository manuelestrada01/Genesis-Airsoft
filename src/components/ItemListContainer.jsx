
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, getProducts, getCategories } from "../firebase/db";
import ItemList from "./ItemList";

const ItemListContainer = () => {
  const { categoryId } = useParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error("Error al traer categorías:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let productsFromDb;

        if (categoryId) {
          
          const categoryExists = categories.some((cat) => cat.name === categoryId);
          if (!categoryExists) {
            setProducts([]);
            return;
          }

          
          const q = query(collection(db, "products"), where("category", "==", categoryId));
          const querySnapshot = await getDocs(q);
          productsFromDb = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        } else {
          
          productsFromDb = await getProducts();
        }

        setProducts(productsFromDb);
        console.log("Productos traídos desde Firebase:", productsFromDb);
      } catch (error) {
        console.error("Error al traer productos:", error);
      }
    };

    fetchProducts();
  }, [categoryId, categories]);

  return (
    <ItemList products={products} />
  );
};

export default ItemListContainer;
