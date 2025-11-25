import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { db } from "../../firebase/config";
import { collection, addDoc, updateDoc } from "firebase/firestore";
import { uploadMultipleImages } from "../../firebase/uploadProductImage"; // 🔥 MULTI-IMAGEN
import "./admin.css";

export default function AdminAddProduct() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    imageFiles: [], // 🔥 ahora ES UN ARRAY
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔥 HANDLER para inputs + múltiples imágenes
  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files && files.length > 0) {
      setForm({ ...form, imageFiles: Array.from(files) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // 🔥 GUARDAR PRODUCTO
  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage("");

      // Validaciones
      if (!form.name || !form.price || !form.category) {
        setMessage("Todos los campos obligatorios deben estar completos.");
        setLoading(false);
        return;
      }

      if (!form.imageFiles || form.imageFiles.length === 0) {
  setMessage("Debes seleccionar al menos una imagen.");
  return;
}


      // 1️⃣ Crear documento inicial (sin imágenes)
      const productRef = await addDoc(collection(db, "products"), {
        name: form.name,
        price: Number(form.price),
        category: form.category,
        description: form.description,
        images: [],      // 🔥 MULTI-IMAGEN
        cover: "",       // 🔥 imagen principal
        createdAt: new Date(),
      });

      // 2️⃣ Subir TODAS las imágenes seleccionadas
      const uploadedImages = await uploadMultipleImages(
        form.imageFiles,
        productRef.id
      );

      // 3️⃣ Guardar en Firestore
      await updateDoc(productRef, {
        images: uploadedImages,          // 🔥 array [{ imageUrl, imagePath }]
        cover: uploadedImages[0].imageUrl,  // primera imagen = portada
      });

      setMessage("Producto guardado con éxito ✔");

      // 4️⃣ Reset formulario
      setForm({
        name: "",
        price: "",
        category: "",
        description: "",
        imageFiles: [],
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
          <input
            name="price"
            type="number"
            value={form.price}
            onChange={handleChange}
          />

          <label>Categoría</label>
          <input name="category" value={form.category} onChange={handleChange} />

          <label>Descripción</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
          />

          <label>Imágenes (puedes seleccionar varias)</label>
          <input
            type="file"
            accept="image/*"
            multiple      // 🔥 MULTI-IMAGEN
            onChange={handleChange}
          />

          <button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar Producto"}
          </button>

          {message && <p className="admin-msg">{message}</p>}
        </form>
      </div>
    </div>
  );
}