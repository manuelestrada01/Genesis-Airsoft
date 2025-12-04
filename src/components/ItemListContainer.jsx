import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
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

// ================================
// 🔒 Sanitizar texto de búsqueda
// ================================
const sanitize = (text) =>
  text
    ?.toString()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim() || "";

const ItemListContainer = () => {
  const { categoryId } = useParams();
  const location = useLocation();

  // ================================
  // 🔍 CAPTURAR TEXTO DE BÚSQUEDA
  // ================================
  const searchQuery = sanitize(
    new URLSearchParams(location.search).get("query")
  );

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [lastDoc, setLastDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMoreProducts, setNoMoreProducts] = useState(false);

  // ============================
  // 1) Cargar categorías
  // ============================
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((e) => console.error("Error al traer categorías:", e));
  }, []);

  // ==========================================================
  // 2) Cargar productos según:
  //    ✔ categoría
  //    ✔ búsqueda por texto
  // ==========================================================
  useEffect(() => {
    loadInitialProducts();
  }, [categoryId, categories, searchQuery]);

  const loadInitialProducts = async () => {
    try {
      setNoMoreProducts(false);
      setLastDoc(null);

      let q;

      // =============================
      // 🔎 PRIORIDAD 1: BÚSQUEDA
      // =============================
      if (searchQuery) {
        const snap = await getDocs(collection(db, "products"));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const filtered = all.filter((p) => {
          const name = sanitize(p.name);
          const cat = sanitize(p.category);
          const desc = sanitize(p.description);

          return (
            name.includes(searchQuery) ||
            cat.includes(searchQuery) ||
            desc.includes(searchQuery)
          );
        });

        // Sin paginación aquí porque Firebase no permite
        // `where` + búsqueda parcial
        setProducts(filtered);
        setNoMoreProducts(true);
        return;
      }

      // =======================================
      // 🔎 PRIORIDAD 2: FILTRO POR CATEGORÍA
      // =======================================
      if (categoryId) {
        const exists = categories.some((c) => c.name === categoryId);

        if (!exists) {
          setProducts([]);
          return;
        }

        q = query(
          collection(db, "products"),
          where("category", "==", categoryId),
          orderBy("price", "desc"),
          limit(12)
        );
      } else {
        // HOME normal
        q = query(
          collection(db, "products"),
          orderBy("price", "desc"),
          limit(12)
        );
      }

      const snap = await getDocs(q);

      if (snap.empty) {
        setProducts([]);
        setNoMoreProducts(true);
        return;
      }

      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (e) {
      console.error("Error al traer productos:", e);
    }
  };

  // ============================
  // 3) PAGINACIÓN (solo home/categoría)
  // ============================
  const loadMoreProducts = async () => {
    if (!lastDoc || noMoreProducts || searchQuery) return;

    try {
      setLoadingMore(true);

      let q;
      if (categoryId) {
        q = query(
          collection(db, "products"),
          where("category", "==", categoryId),
          orderBy("price", "desc"),
          startAfter(lastDoc),
          limit(12)
        );
      } else {
        q = query(
          collection(db, "products"),
          orderBy("price", "desc"),
          startAfter(lastDoc),
          limit(12)
        );
      }

      const snap = await getDocs(q);

      if (snap.empty) {
        setNoMoreProducts(true);
        return;
      }

      setProducts((prev) => [...prev, ...snap.docs.map((d) => ({ id: d.id, ...d.data() }))]);
      setLastDoc(snap.docs[snap.docs.length - 1]);
    } catch (e) {
      console.error("Error al cargar más productos:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      {/* 🔥 LISTA DE PRODUCTOS */}
      <ItemList products={products} />

      {/* 🔥 NO HAY PAGINACIÓN CUANDO SE BUSCA */}
      {!searchQuery && !noMoreProducts && products.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 30 }}>
          <button
            onClick={loadMoreProducts}
            disabled={loadingMore}
            style={{
              padding: "12px 20px",
              background: "#222",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            {loadingMore ? "Cargando..." : "Cargar más"}
          </button>
        </div>
      )}

      {noMoreProducts && !searchQuery && (
        <p style={{ textAlign: "center", marginTop: 25, color: "#777" }}>
          No hay más productos para mostrar.
        </p>
      )}
    </div>
  );
};

export default ItemListContainer;
