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
      const cleanHTML = sanitizeHTML(form.description);

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
        <h1>Agregar Producto</h1>

        <form className="admin-form" onSubmit={(e) => e.preventDefault()}>
          <label>Nombre *</label>
          <input name="name" value={form.name} onChange={handleChange} />

          <label>Precio *</label>
          <input name="price" type="number" value={form.price} onChange={handleChange} />

          <label>Descuento (%)</label>
          <input
            name="discount"
            type="number"
            min="0"
            max="90"
            value={form.discount}
            onChange={handleChange}
          />

          <label>Stock *</label>
          <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} />

          <label>Categoría *</label>
          <input name="category" value={form.category} onChange={handleChange} />

          <label>Descripción (permite bullets y formato)</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Pegá aquí la descripción con viñetas o formato..."
            style={{ minHeight: "180px" }}
          />

          <label>Imágenes *</label>
          <input type="file" multiple accept="image/*" onChange={handleChange} />

          <button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar Producto"}
          </button>

          {message && <p className="admin-msg">{message}</p>}
        </form>
      </div>
    </div>
  );
}
