import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

import AdminSidebar from "./AdminSidebar";
import "./admin.css";
import { Link } from "react-router-dom";
import { deleteProductImage } from "../../firebase/uploadProductImage";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const snapshot = await getDocs(collection(db, "products"));
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    };
    load();
  }, []);

  const handleDelete = async (product) => {
    const confirmDelete = window.confirm(
      `¿Seguro que deseas eliminar el producto "${product.name}"?`
    );

    if (!confirmDelete) return;

    try {
      // Borrar imagen principal si existe
      if (product.imagePath) {
        await deleteProductImage(product.imagePath);
      }

      // Borrar imágenes múltiples si existen
      if (product.images && Array.isArray(product.images)) {
        for (const img of product.images) {
          if (img.imagePath) await deleteProductImage(img.imagePath);
        }
      }

      // Borrar el documento
      await deleteDoc(doc(db, "products", product.id));

      // Actualizar listado local
      setProducts((prev) => prev.filter((p) => p.id !== product.id));

      alert("Producto eliminado correctamente.");
    } catch (error) {
      console.error("Error eliminando producto:", error);
      alert("Error eliminando el producto.");
    }
  };

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
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              // UNIVERSAL IMAGE PICKER 🔥
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
      </div>
    </div>
  );
}
