// AdminProducts.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";

import AdminSidebar from "./AdminSidebar";
import "./admin.css";
import { Link } from "react-router-dom";
import { deleteProductImage } from "../../firebase/uploadProductImage";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============================================================
  // 1️⃣ Cargar todos los productos
  // ============================================================
  useEffect(() => {
    const loadAll = async () => {
      try {
        const ref = collection(db, "products");
        const q = query(ref, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(items);
      } catch (err) {
        console.error("❌ Error cargando productos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // ============================================================
  // 2️⃣ Eliminar producto (seguro)
  // ============================================================
  const handleDelete = async (product) => {
    const confirmDelete = window.confirm(
      `¿Seguro que deseas eliminar el producto "${product.name}"?`
    );

    if (!confirmDelete) return;

    try {
      if (product.images && Array.isArray(product.images)) {
        for (const img of product.images) {
          if (img.imagePath) await deleteProductImage(img.imagePath);
        }
      }

      await deleteDoc(doc(db, "products", product.id));

      setProducts((prev) => prev.filter((p) => p.id !== product.id));

      alert("Producto eliminado correctamente.");
    } catch (error) {
      console.error("❌ Error eliminando producto:", error);
      alert("Error eliminando el producto.");
    }
  };

  // ============================================================
  // 3️⃣ Pausar / Activar un solo producto
  // ============================================================
  const togglePause = async (product) => {
    try {
      const ref = doc(db, "products", product.id);
      await updateDoc(ref, { paused: !product.paused });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, paused: !p.paused } : p
        )
      );
    } catch (err) {
      console.error("❌ Error cambiando estado de pausa:", err);
      alert("No se pudo actualizar el estado.");
    }
  };

  // ============================================================
  // 4️⃣ Pausar o activar TODOS los productos
  // ============================================================
  const togglePauseAll = async (pauseValue) => {
    const confirmMsg = pauseValue
      ? "¿Seguro que deseas PAUSAR TODAS las publicaciones?"
      : "¿Seguro que deseas ACTIVAR TODAS las publicaciones?";

    if (!window.confirm(confirmMsg)) return;

    try {
      setBulkLoading(true);

      const batch = writeBatch(db);
      products.forEach((p) => {
        const ref = doc(db, "products", p.id);
        batch.update(ref, { paused: pauseValue });
      });

      await batch.commit();

      setProducts((prev) =>
        prev.map((p) => ({ ...p, paused: pauseValue }))
      );

      alert(
        pauseValue
          ? "Todas las publicaciones fueron pausadas."
          : "Todas las publicaciones fueron activadas."
      );
    } catch (err) {
      console.error("❌ Error en pausa masiva:", err);
      alert("No se pudieron actualizar todas las publicaciones.");
    } finally {
      setBulkLoading(false);
    }
  };

  // ============================================================
  // 5️⃣ Render
  // ============================================================
  if (loading) return <p style={{ padding: 20 }}>Cargando productos...</p>;

  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <h1>Productos</h1>

        <div className="ap-toolbar">
          <input
            className="ap-search"
            placeholder="Buscar por nombre o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="ap-toolbar-right">
            <button
              onClick={() => togglePauseAll(true)}
              disabled={bulkLoading}
              className="ap-bulk-btn ap-bulk-pause"
            >
              Pausar TODOS
            </button>
            <button
              onClick={() => togglePauseAll(false)}
              disabled={bulkLoading}
              className="ap-bulk-btn ap-bulk-activate"
            >
              Activar TODOS
            </button>
            <Link to="/admin/products/add" className="ap-add-btn">
              + Agregar
            </Link>
          </div>
        </div>

        {filteredProducts.length === 0 && (
          <p className="ap-empty">Sin resultados.</p>
        )}

        <div className="ap-grid">
          {filteredProducts.map((p) => {
            const img =
              p.cover || p.images?.[0]?.imageUrl || p.image || "";

            return (
              <div
                key={p.id}
                className={`ap-card${p.paused ? " ap-card--paused" : ""}`}
              >
                <div className="ap-card-img-wrap">
                  <img src={img} alt={p.name} className="ap-card-img" />
                  {p.paused && (
                    <span className="ap-card-badge-paused">PAUSADO</span>
                  )}
                </div>

                <div className="ap-card-body">
                  <span className="ap-card-category">{p.category}</span>
                  <p className="ap-card-name">{p.name}</p>
                  <div className="ap-card-meta">
                    <span className="ap-card-price">${p.price}</span>
                    <span className="ap-card-stock">
                      Stock: {p.stock ?? 0}
                    </span>
                  </div>
                </div>

                <div className="ap-card-actions">
                  <button
                    className="ap-action-btn ap-action-toggle"
                    onClick={() => togglePause(p)}
                  >
                    {p.paused ? "Activar" : "Pausar"}
                  </button>
                  <Link
                    to={`/admin/products/edit/${p.id}`}
                    className="ap-action-btn ap-action-edit"
                  >
                    Editar
                  </Link>
                  <button
                    className="ap-action-btn ap-action-delete"
                    onClick={() => handleDelete(p)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
