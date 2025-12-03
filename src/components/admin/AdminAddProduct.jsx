// AdminAddProduct.jsx
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
    discount: 0,
    stock: 0,            // 🔥 NUEVO CAMPO DE STOCK
    category: "",
    description: "",
    imageFiles: [],
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

      // Validaciones
      if (!form.name || !form.price || !form.category) {
        setMessage("Todos los campos obligatorios deben estar completos.");
        setLoading(false);
        return;
      }

      if (form.stock < 0) {
        setMessage("El stock no puede ser negativo.");
        setLoading(false);
        return;
      }

      if (!form.imageFiles || form.imageFiles.length === 0) {
        setMessage("Debes seleccionar al menos una imagen.");
        return;
      }

      // Preparar campos
      const priceNum = Number(form.price);
      const discountNum = Number(form.discount);
      const stockNum = Number(form.stock);

      const finalPrice =
        priceNum - (priceNum * discountNum) / 100;

      // Crear el producto en Firestore
      const productRef = await addDoc(collection(db, "products"), {
        name: form.name,
        price: priceNum,
        discount: discountNum,
        finalPrice: finalPrice,
        stock: stockNum,               // 🔥 GUARDAR STOCK
        category: form.category,
        description: form.description,
        images: [],
        cover: "",
        createdAt: new Date(),
      });

      // Subir imágenes
      const uploadedImages = await uploadMultipleImages(
        form.imageFiles,
        productRef.id
      );

      await updateDoc(productRef, {
        images: uploadedImages,
        cover: uploadedImages[0].imageUrl,
      });

      setMessage("Producto guardado con éxito ✔");

      // Reset del formulario
      setForm({
        name: "",
        price: "",
        discount: 0,
        stock: 0,
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

          <label>Descuento (%)</label>
          <input
            name="discount"
            type="number"
            min="0"
            max="90"
            value={form.discount}
            onChange={handleChange}
          />

          {/* 🔥 NUEVO CAMPO STOCK */}
          <label>Stock Disponible</label>
          <input
            name="stock"
            type="number"
            min="0"
            value={form.stock}
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

          <label>Imágenes</label>
          <input
            type="file"
            accept="image/*"
            multiple
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
