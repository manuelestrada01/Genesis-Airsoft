import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db, getCategories } from "../firebase/db";
import ItemList from "./ItemList";

const ItemListContainer = () => {
  const { categoryId } = useParams();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [lastDoc, setLastDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMoreProducts, setNoMoreProducts] = useState(false);



  // ============================
  // 🔥 1) Cargar categorías
  // ============================
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

  // ============================
  // 🔥 2) Cargar productos iniciales (12)
  // ============================
  useEffect(() => {
    loadInitialProducts();
  }, [categoryId, categories]);

  const loadInitialProducts = async () => {
    try {
      setNoMoreProducts(false);
      setLastDoc(null);

      let q;

      if (categoryId) {
        const exists = categories.some((cat) => cat.name === categoryId);

        if (!exists) {
          setProducts([]);
          return;
        }

        q = query(
          collection(db, "products"),
          where("category", "==", categoryId),
          orderBy("price", "desc"), // 🔥 CAMBIO CLAVE
          limit(12)
        );
      } else {
        q = query(
          collection(db, "products"),
          orderBy("price", "desc"), // 🔥 CAMBIO CLAVE
          limit(12)
        );
      }

      const snap = await getDocs(q);

      if (snap.empty) {
        setProducts([]);
        setNoMoreProducts(true);
        return;
      }

      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setProducts(list);
      setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (error) {
      console.error("Error al traer productos:", error);
    }
  };

  // ============================
  // 🔥 3) Cargar más productos (paginación)
  // ============================
  const loadMoreProducts = async () => {
    if (!lastDoc || noMoreProducts) return;

    try {
      setLoadingMore(true);

      let q;

      if (categoryId) {
        q = query(
          collection(db, "products"),
          where("category", "==", categoryId),
          orderBy("price", "desc"), // 🔥 CAMBIO CLAVE
          startAfter(lastDoc),
          limit(12)
        );
      } else {
        q = query(
          collection(db, "products"),
          orderBy("price", "desc"), // 🔥 CAMBIO CLAVE
          startAfter(lastDoc),
          limit(12)
        );
      }

      const snap = await getDocs(q);

      if (snap.empty) {
        setNoMoreProducts(true);
        return;
      }

      const more = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setProducts((prev) => [...prev, ...more]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (error) {
      console.error("Error al cargar más productos:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <ItemList products={products} />

      {/* ========================== */}
      {/* 🔥 BOTÓN "CARGAR MÁS"     */}
      {/* ========================== */}
      {!noMoreProducts && products.length > 0 && (
        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <button
            onClick={loadMoreProducts}
            disabled={loadingMore}
            style={{
              padding: "12px 20px",
              background: "#222",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            {loadingMore ? "Cargando..." : "Cargar más"}
          </button>
        </div>
      )}

      {noMoreProducts && (
        <p style={{ textAlign: "center", marginTop: "25px", color: "#777" }}>
          No hay más productos para mostrar.
        </p>
      )}
    </div>
  );
};

export default ItemListContainer;
