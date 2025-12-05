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
  limit,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";

import AdminSidebar from "./AdminSidebar";
import "./admin.css";
import { Link } from "react-router-dom";
import { deleteProductImage } from "../../firebase/uploadProductImage";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreAvailable, setMoreAvailable] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  // ============================================================
  // ⭐ 1️⃣ Cargar primeros 15 productos
  // ============================================================
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const ref = collection(db, "products");
        const q = query(ref, orderBy("createdAt", "desc"), limit(15));

        const snapshot = await getDocs(q);

        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setProducts(items);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setMoreAvailable(snapshot.docs.length === 15);
      } catch (err) {
        console.error("❌ Error cargando productos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  // ============================================================
  // ⭐ 2️⃣ Cargar más productos (paginación)
  // ============================================================
  const loadMore = async () => {
    if (!lastDoc) return;

    setLoadingMore(true);

    try {
      const ref = collection(db, "products");
      const q = query(
        ref,
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(15)
      );

      const snapshot = await getDocs(q);

      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts((prev) => [...prev, ...items]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setMoreAvailable(snapshot.docs.length === 15);
    } catch (err) {
      console.error("❌ Error cargando más productos:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ============================================================
  // ⭐ 3️⃣ Eliminar producto (seguro)
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
  // ⭐ 4️⃣ Pausar / Activar un solo producto
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
  // ⭐ 5️⃣ Pausar o activar TODOS los productos
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
  // ⭐ 6️⃣ Render
  // ============================================================
  if (loading) return <p style={{ padding: 20 }}>Cargando productos...</p>;

  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <h1>Productos</h1>

        <Link to="/admin/products/add" className="admin-add-btn">
          + Agregar Producto
        </Link>

        {/* 🔥 BOTÓN PAUSAR/ACTIVAR TODOS */}
        <div style={{ margin: "15px 0" }}>
          <button
            onClick={() => togglePauseAll(true)}
            disabled={bulkLoading}
            className="admin-danger-btn"
          >
            Pausar TODOS
          </button>

          <button
            onClick={() => togglePauseAll(false)}
            disabled={bulkLoading}
            className="admin-ok-btn"
            style={{ marginLeft: "10px" }}
          >
            Activar TODOS
          </button>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Pausado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const img =
                p.cover ||
                p.images?.[0]?.imageUrl ||
                p.image ||
                "";

              return (
                <tr
                  key={p.id}
                  style={{
                    opacity: p.paused ? 0.4 : 1,
                  }}
                >
                  <td>
                    <img
                      src={img}
                      alt={p.name}
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                      }}
                    />
                  </td>

                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>${p.price}</td>
                  <td>{p.stock ?? 0}</td>

                  <td>
                    {p.paused ? (
                      <span className="badge-paused">PAUSADO</span>
                    ) : (
                      <span className="badge-active">Activo</span>
                    )}
                  </td>

                  <td>
                    <button
                      className="admin-edit-btn"
                      onClick={() => togglePause(p)}
                    >
                      {p.paused ? "Activar" : "Pausar"}
                    </button>

                    <Link
                      to={`/admin/products/edit/${p.id}`}
                      className="admin-edit-btn"
                    >
                      Editar
                    </Link>

                    <button
                      className="admin-delete-btn"
                      onClick={() => handleDelete(p)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {moreAvailable && (
          <button
            className="admin-load-more"
            onClick={loadMore}
            disabled={loadingMore}
            style={{ marginTop: "20px" }}
          >
            {loadingMore ? "Cargando..." : "Cargar más productos"}
          </button>
        )}
      </div>
    </div>
  );
}
