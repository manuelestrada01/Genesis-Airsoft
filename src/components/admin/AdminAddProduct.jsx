import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { db } from "../../firebase/config";
import { collection, addDoc, updateDoc } from "firebase/firestore";
import { uploadMultipleImages } from "../../firebase/uploadProductImage";
import "./admin.css";

export default function AdminAddProduct() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    imageFiles: [],
    tag: "",           // ← NUEVO
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files && files.length > 0) {
      setForm({ ...form, imageFiles: Array.from(files) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (!form.name || !form.price || !form.category) {
        setMessage("Todos los campos obligatorios deben estar completos.");
        setLoading(false);
        return;
      }

      if (!form.imageFiles.length) {
        setMessage("Debes seleccionar al menos una imagen.");
        return;
      }

      const productRef = await addDoc(collection(db, "products"), {
        name: form.name,
        price: Number(form.price),
        category: form.category,
        description: form.description,
        tag: form.tag || "",     // ← NUEVO
        images: [],
        cover: "",
        createdAt: new Date(),
      });

      const uploadedImages = await uploadMultipleImages(
        form.imageFiles,
        productRef.id
      );

      await updateDoc(productRef, {
        images: uploadedImages,
        cover: uploadedImages[0].imageUrl,
      });

      setMessage("Producto guardado con éxito ✔");

      setForm({
        name: "",
        price: "",
        category: "",
        description: "",
        imageFiles: [],
        tag: "",
      });

    } catch (error) {
      console.error("Error al guardar producto:", error);
      setMessage("Ocurrió un error al guardar el producto.");
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

          <label>Nombre</label>
          <input name="name" value={form.name} onChange={handleChange} />

          <label>Precio</label>
          <input name="price" type="number" value={form.price} onChange={handleChange} />

          <label>Categoría</label>
          <input name="category" value={form.category} onChange={handleChange} />

          <label>Descripción</label>
          <textarea name="description" value={form.description} onChange={handleChange}></textarea>

          {/* TAG SELECTOR */}
          <label>Etiqueta (opcional)</label>
          <select name="tag" value={form.tag} onChange={handleChange}>
            <option value="">Sin etiqueta</option>
            <option value="hot">🔥 Hot</option>
            <option value="new">🆕 Nuevo</option>
            <option value="sale">💸 Oferta</option>
            <option value="limited">⭐ Limited</option>
          </select>

          <label>Imágenes (puedes seleccionar varias)</label>
          <input type="file" accept="image/*" multiple onChange={handleChange} />

          <button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar Producto"}
          </button>

          {message && <p className="admin-msg">{message}</p>}
        </form>
      </div>
    </div>
  );
}
