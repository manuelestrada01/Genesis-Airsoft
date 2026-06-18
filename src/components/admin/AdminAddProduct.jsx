// AdminAddProduct.jsx
import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { db } from "../../firebase/config";
import { collection, addDoc, updateDoc } from "firebase/firestore";
import { uploadMultipleImages } from "../../firebase/uploadProductImage";
import DOMPurify from "dompurify";
import "./admin.css";

// Limpieza segura permitiendo HTML básico
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

export default function AdminAddProduct() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    discount: 0,
    stock: 0,
    category: "",
    description: "",
    imageFiles: [],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files && files.length > 0) {
      setForm({ ...form, imageFiles: [...files] });
      return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleSave = async () => {
    setMessage("");

    if (!form.name.trim() || !form.category.trim()) {
      return setMessage("Nombre y categoría son obligatorios.");
    }

    const price = Number(form.price);
    if (isNaN(price) || price <= 0) {
      return setMessage("El precio debe ser mayor a 0.");
    }

    const discount = Number(form.discount);
    if (discount < 0 || discount > 90) {
      return setMessage("El descuento debe estar entre 0% y 90%.");
    }

    const stock = Number(form.stock);
    if (stock < 0) {
      return setMessage("El stock no puede ser negativo.");
    }

    if (!form.imageFiles.length) {
      return setMessage("Debes subir al menos 1 imagen.");
    }

    setLoading(true);

    try {
      const cleanHTML = sanitizeHTML(
        form.description
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/\s*[\u00B7\u2022\u2027\u2219\u22C5\u25CF\u25AA\u25E6]\s*/g, "\n• ")
          .replace(/\n/g, "<br>")
      );

      const finalPrice = Number(
        (price - (price * discount) / 100).toFixed(2)
      );

      const productRef = await addDoc(collection(db, "products"), {
        name: form.name.trim(),
        price,
        discount,
        finalPrice,
        stock,
        category: form.category.trim(),
        description: cleanHTML,
        images: [],
        cover: "",
        paused: false,
        createdAt: new Date(),
      });

      const uploadedImages = await uploadMultipleImages(
        form.imageFiles,
        productRef.id
      );

      await updateDoc(productRef, {
        images: uploadedImages,
        cover: uploadedImages[0]?.imageUrl || "",
      });

      setMessage("Producto guardado con éxito ✔");

      setForm({
        name: "",
        price: "",
        discount: 0,
        stock: 0,
        category: "",
        description: "",
        imageFiles: [],
      });
    } catch (err) {
      console.error(err);
      setMessage("Ocurrió un error al guardar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <div className="af-header">
          <h1 className="af-page-title">Agregar Producto</h1>
        </div>

        <form className="af-form" onSubmit={(e) => e.preventDefault()}>

          {/* Nombre */}
          <div className="af-field">
            <label className="af-label">Nombre *</label>
            <input
              className="af-input"
              name="name"
              value={form.name}
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
                value={form.price}
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
                value={form.discount}
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
                value={form.stock}
                onChange={handleChange}
              />
            </div>
            <div className="af-field">
              <label className="af-label">Categoría *</label>
              <select
                className="af-select"
                name="category"
                value={form.category}
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
            <label className="af-label">Descripción (permite bullets y formato)</label>
            <textarea
              className="af-textarea"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Pegá aquí la descripción con viñetas o formato..."
            />
          </div>

          <hr className="af-divider" />

          {/* Imágenes */}
          <div className="af-field">
            <label className="af-label">Imágenes *</label>
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
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="af-actions">
            <button
              className="af-save-btn"
              type="button"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar Producto"}
            </button>

            {message && (
              <p className={`af-msg ${message === "Producto guardado con éxito ✔" ? "af-msg--success" : "af-msg--error"}`}>
                {message}
              </p>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}
