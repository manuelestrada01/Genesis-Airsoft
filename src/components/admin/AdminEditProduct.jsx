// AdminEditProduct.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  uploadMultipleImages,
  deleteProductImage,
} from "../../firebase/uploadProductImage";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";

// Utilidad para prevenir XSS
const sanitizeText = (str) => str.replace(/<[^>]*>?/gm, "").trim();

export default function AdminEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [newImages, setNewImages] = useState([]);

  // ============================================================
  // 1️⃣ Cargar producto
  // ============================================================
  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, "products", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          alert("Producto no encontrado.");
          navigate("/admin/products");
          return;
        }

        const data = snap.data();
        const imgs = Array.isArray(data.images) ? data.images : [];

        setProduct({
          id,
          ...data,
          images: imgs,
          cover: data.cover || imgs[0]?.imageUrl || "",
          paused: data.paused ?? false, // 🔥 NUEVO
          discount: data.discount || 0,
          finalPrice: data.finalPrice || data.price,
          stock: data.stock ?? 0,
        });

        setLoading(false);
      } catch (e) {
        console.error("Error cargando producto:", e);
      }
    };

    load();
  }, [id, navigate]);

  // ============================================================
  // 2️⃣ Inputs
  // ============================================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setProduct({
      ...product,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // ============================================================
  // 3️⃣ Nuevas imágenes
  // ============================================================
  const handleNewImages = (e) => {
    setNewImages([...e.target.files]);
  };

  // ============================================================
  // 4️⃣ Eliminar imagen
  // ============================================================
  const handleDeleteImage = async (img) => {
    if (!img?.imagePath) return;

    if (!confirm("¿Eliminar esta imagen?")) return;

    try {
      await deleteProductImage(img.imagePath);

      const updatedImgs = product.images.filter(
        (i) => i.imagePath !== img.imagePath
      );

      const newCover = updatedImgs[0]?.imageUrl || "";

      await updateDoc(doc(db, "products", product.id), {
        images: updatedImgs,
        cover: newCover,
      });

      setProduct({ ...product, images: updatedImgs, cover: newCover });
    } catch (e) {
      console.error("Error eliminando imagen:", e);
      alert("Error al eliminar imagen");
    }
  };

  // ============================================================
  // 5️⃣ Guardar cambios (validación + sanitización)
  // ============================================================
  const handleSave = async () => {
    if (!product) return;

    const price = Number(product.price);
    const discount = Number(product.discount);
    const stock = Number(product.stock);

    if (!product.name.trim()) return alert("El nombre es obligatorio.");
    if (!product.category.trim()) return alert("La categoría es obligatoria.");
    if (isNaN(price) || price <= 0) return alert("Precio inválido.");
    if (discount < 0 || discount > 90) return alert("Descuento inválido.");
    if (stock < 0) return alert("El stock no puede ser negativo.");

    if (!confirm("¿Guardar cambios?")) return;

    setSaving(true);

    try {
      const ref = doc(db, "products", product.id);

      let updatedImages = [...product.images];

      if (newImages.length > 0) {
        const uploaded = await uploadMultipleImages(newImages, product.id);
        updatedImages = [...updatedImages, ...uploaded];
      }

      const cover =
        updatedImages.length > 0 ? updatedImages[0].imageUrl : "";

      const finalPrice = Number(
        (price - (price * discount) / 100).toFixed(2)
      );

      await updateDoc(ref, {
        name: sanitizeText(product.name),
        price,
        discount,
        finalPrice,
        stock,
        category: sanitizeText(product.category),
        description: sanitizeText(product.description),
        images: updatedImages,
        cover,
        paused: product.paused, // 🔥 NUEVO: guardamos la pausa
      });

      alert("Producto actualizado ✔");
      navigate("/admin/products");
    } catch (e) {
      console.error("Error guardando:", e);
      alert("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Cargando producto...</p>;

  // ============================================================
  // 6️⃣ Render
  // ============================================================
  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <h1>Editar Producto</h1>

        <form className="admin-form" onSubmit={(e) => e.preventDefault()}>

          <label>Nombre *</label>
          <input name="name" value={product.name} onChange={handleChange} />

          <label>Precio *</label>
          <input name="price" type="number" value={product.price} onChange={handleChange} />

          <label>Descuento (%)</label>
          <input name="discount" type="number" min="0" max="90" value={product.discount} onChange={handleChange} />

          <label>Stock *</label>
          <input name="stock" type="number" min="0" value={product.stock} onChange={handleChange} />

          <label>Categoría *</label>
          <input name="category" value={product.category} onChange={handleChange} />

          <label>Descripción</label>
          <textarea name="description" value={product.description} onChange={handleChange} />

          {/* 🔥 NUEVO: CHECKBOX PAUSAR */}
          <label style={{ marginTop: "20px", fontWeight: "bold" }}>
            <input
              type="checkbox"
              name="paused"
              checked={product.paused}
              onChange={handleChange}
              style={{ marginRight: "10px" }}
            />
            Pausar publicación
          </label>

          <label>Imágenes actuales</label>
          <div className="admin-image-grid">
            {product.images.map((img, i) => (
              <div key={i} className="admin-image-box">
                <img src={img.imageUrl} className="admin-image-preview" />
                <button type="button" onClick={() => handleDeleteImage(img)}>
                  eliminar
                </button>
              </div>
            ))}
          </div>

          <label>Nuevas imágenes</label>
          <input type="file" multiple accept="image/*" onChange={handleNewImages} />

          <button
            type="button"
            className="admin-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>

        </form>
      </div>
    </div>
  );
}
