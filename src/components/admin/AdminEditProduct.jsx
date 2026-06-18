// AdminEditProduct.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  uploadMultipleImages,
  deleteProductImage,
} from "../../firebase/uploadProductImage";
import AdminSidebar from "./AdminSidebar";
import DOMPurify from "dompurify";
import "./admin.css";

// Sanitizar HTML permitido
const sanitizeHTML = (html) =>
  DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "b", "strong", "i", "em", "u",
      "p", "br",
      "ul", "ol", "li",
      "h1", "h2", "h3", "h4"
    ],
    ALLOWED_ATTR: []
  });

export default function AdminEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [newImages, setNewImages] = useState([]);

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
          paused: data.paused ?? false,
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setProduct({
      ...product,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleNewImages = (e) => {
    setNewImages([...e.target.files]);
  };

  const handleDeleteImage = async (img) => {
    if (!confirm("¿Eliminar esta imagen?")) return;

    try {
      await deleteProductImage(img.imagePath);

      const newList = product.images.filter((i) => i.imagePath !== img.imagePath);
      const newCover = newList[0]?.imageUrl || "";

      await updateDoc(doc(db, "products", product.id), {
        images: newList,
        cover: newCover,
      });

      setProduct({ ...product, images: newList, cover: newCover });
    } catch (err) {
      alert("No se pudo eliminar la imagen");
    }
  };

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

      const cover = updatedImages[0]?.imageUrl || "";

      const cleanHTML = sanitizeHTML(
        product.description
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/\s*[\u00B7\u2022\u2027\u2219\u22C5\u25CF\u25AA\u25E6]\s*/g, "\n• ")
          .replace(/\n/g, "<br>")
      );

      const finalPrice = Number(
        (price - (price * discount) / 100).toFixed(2)
      );

      await updateDoc(ref, {
        name: product.name.trim(),
        price,
        discount,
        finalPrice,
        stock,
        category: product.category.trim(),
        description: cleanHTML,
        images: updatedImages,
        cover,
        paused: product.paused,
      });

      alert("Producto actualizado ✔");
      navigate("/admin/products");
    } catch (err) {
      alert("No se pudieron guardar los cambios.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Cargando...</p>;

  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <div className="af-header">
          <Link to="/admin/products" className="af-back-link">← Volver</Link>
          <h1 className="af-page-title">Editar Producto</h1>
        </div>

        <form className="af-form" onSubmit={(e) => e.preventDefault()}>

          {/* Nombre */}
          <div className="af-field">
            <label className="af-label">Nombre *</label>
            <input
              className="af-input"
              name="name"
              value={product.name}
              onChange={handleChange}
            />
          </div>

          {/* Precio + Descuento */}
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Precio *</label>
              <input
                className="af-input"
                name="price"
                type="number"
                value={product.price}
                onChange={handleChange}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Descuento (%)</label>
              <input
                className="af-input"
                name="discount"
                type="number"
                min="0"
                max="90"
                value={product.discount}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Stock + Categoría */}
          <div className="af-row">
            <div className="af-field">
              <label className="af-label">Stock *</label>
              <input
                className="af-input"
                name="stock"
                type="number"
                min="0"
                value={product.stock}
                onChange={handleChange}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Categoría *</label>
              <select
                className="af-select"
                name="category"
                value={product.category || ""}
                onChange={handleChange}
              >
                <option value="">Seleccioná…</option>
                <option value="Insumos">Insumos</option>
                <option value="Marcadoras AEG">Marcadoras AEG</option>
                <option value="Accesorios">Accesorios</option>
                <option value="Indumentaria">Indumentaria</option>
                <option value="Marcadoras GBB">Marcadoras GBB</option>
                <option value="Magazines">Magazines</option>
                <option value="Repuestos">Repuestos</option>
                <option value="Baterias">Baterias</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div className="af-field">
            <label className="af-label">Descripción (HTML permitido)</label>
            <textarea
              className="af-textarea"
              name="description"
              value={product.description}
              onChange={handleChange}
            />
          </div>

          <hr className="af-divider" />

          {/* Estado de publicación */}
          <div className="af-field">
            <label className="af-label">Estado de publicación</label>
            <div className="af-toggle-row">
              <div className="af-toggle-label-group">
                <span className="af-toggle-title">Pausar publicación</span>
                <span className="af-toggle-hint">
                  {product.paused
                    ? "El producto está oculto en la tienda"
                    : "El producto está visible en la tienda"}
                </span>
              </div>
              <input
                className="af-toggle-checkbox"
                type="checkbox"
                name="paused"
                checked={product.paused}
                onChange={handleChange}
              />
            </div>
          </div>

          <hr className="af-divider" />

          {/* Imágenes actuales */}
          <div className="af-field">
            <label className="af-label">Imágenes actuales</label>
            <div className="af-img-grid">
              {product.images.map((img, i) => (
                <div key={i} className="af-img-box">
                  <img src={img.imageUrl} className="af-img-preview" alt="" />
                  <button
                    type="button"
                    className="af-img-delete"
                    onClick={() => handleDeleteImage(img)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Nuevas imágenes */}
          <div className="af-field">
            <label className="af-label">Agregar nuevas imágenes</label>
            <div className="af-file-zone">
              <span className="af-file-zone-icon">📎</span>
              <span className="af-file-zone-text">
                Arrastrá o seleccioná imágenes
              </span>
              <input
                className="af-file-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleNewImages}
              />
            </div>
          </div>

          <div className="af-actions">
            <button
              className="af-save-btn"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
