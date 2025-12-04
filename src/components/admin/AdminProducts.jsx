// AdminProducts.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
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
      // Borrar imagen principal (si existiera)
      if (product.imagePath) {
        await deleteProductImage(product.imagePath);
      }

      // Borrar imágenes múltiples
      if (product.images && Array.isArray(product.images)) {
        for (const img of product.images) {
          if (img.imagePath) await deleteProductImage(img.imagePath);
        }
      }

      // Borrar el documento en DB
      await deleteDoc(doc(db, "products", product.id));

      // Actualizar pantalla
      setProducts((prev) => prev.filter((p) => p.id !== product.id));

      alert("Producto eliminado correctamente.");
    } catch (error) {
      console.error("❌ Error eliminando producto:", error);
      alert("Error eliminando el producto.");
    }
  };

  // ============================================================
  // ⭐ 4️⃣ Render
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

        <table className="admin-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              // 🔥 Tu selector original (no lo tocamos)
              const img =
                p.cover ||
                p.imageUrl ||
                p.image ||
                p.images?.[0]?.imageUrl ||
                "";

              return (
                <tr key={p.id}>
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
                        background: "#fff",
                      }}
                    />
                  </td>

                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>${p.price}</td>

                  {/* 🔥 NUEVO: STOCK EN TABLA */}
                  <td>{p.stock ?? 0}</td>

                  <td>
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

        {/* 🔥 BOTÓN CARGAR MÁS */}
        {moreAvailable && (
          <button
            className="admin-load-more"
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            {loadingMore ? "Cargando..." : "Cargar más productos"}
          </button>
        )}
      </div>
    </div>
  );
}
