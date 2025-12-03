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

export default function AdminEditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [newImages, setNewImages] = useState([]);

  // ============================================================
  // ⭐ 1️⃣ Cargar producto existente
  // ============================================================
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const ref = doc(db, "products", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          alert("Producto no encontrado.");
          navigate("/admin/products");
          return;
        }

        const data = snap.data();

        let imagesArray = [];

        if (data.images && Array.isArray(data.images)) {
          imagesArray = data.images;
        } else if (data.imageUrl) {
          imagesArray = [
            { imageUrl: data.imageUrl, imagePath: data.imagePath || "" },
          ];
        }

        setProduct({
          id: snap.id,
          ...data,
          images: imagesArray,
          cover: data.cover || imagesArray[0]?.imageUrl || "",
          discount: data.discount || 0,
          finalPrice: data.finalPrice || data.price,
          stock: data.stock ?? 0,  // 🔥 STOCK CARGADO
        });

        setLoading(false);
      } catch (err) {
        console.error("Error cargando producto:", err);
      }
    };

    loadProduct();
  }, [id, navigate]);

  // ============================================================
  // ⭐ 2️⃣ Cambios en inputs
  // ============================================================
  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  // ============================================================
  // ⭐ 3️⃣ Cargar nuevas imágenes
  // ============================================================
  const handleNewImages = (e) => {
    setNewImages(Array.from(e.target.files));
  };

  // ============================================================
  // ⭐ 4️⃣ Eliminar imagen existente
  // ============================================================
  const handleDeleteImage = async (img) => {
    const ok = confirm("¿Eliminar esta imagen?");
    if (!ok) return;

    try {
      if (img.imagePath) await deleteProductImage(img.imagePath);

      const updatedImages = product.images.filter(
        (i) => i.imagePath !== img.imagePath
      );

      const newCover =
        updatedImages.length > 0 ? updatedImages[0].imageUrl : "";

      await updateDoc(doc(db, "products", product.id), {
        images: updatedImages,
        cover: newCover,
      });

      setProduct({ ...product, images: updatedImages, cover: newCover });

      alert("Imagen eliminada");
    } catch (err) {
      console.error("Error eliminando imagen:", err);
      alert("Error al eliminar imagen");
    }
  };

  // ============================================================
  // ⭐ 5️⃣ Guardar cambios — incluye STOCK
  // ============================================================
  const handleSave = async () => {
    if (!product) return;

    if (product.stock < 0) {
      alert("El stock no puede ser negativo.");
      return;
    }

    const ok = confirm("¿Guardar cambios?");
    if (!ok) return;

    setSaving(true);

    try {
      const ref = doc(db, "products", product.id);

      let updatedImages = [...product.images];

      // Subir nuevas imágenes
      if (newImages.length > 0) {
        const uploaded = await uploadMultipleImages(newImages, product.id);
        updatedImages = [...updatedImages, ...uploaded];
      }

      const coverImage =
        updatedImages.length > 0 ? updatedImages[0].imageUrl : "";

      const priceNum = Number(product.price);
      const discountNum = Number(product.discount);
      const stockNum = Number(product.stock);

      const finalPrice =
        priceNum - (priceNum * discountNum) / 100;

      // Guardar cambios
      await updateDoc(ref, {
        name: product.name,
        price: priceNum,
        discount: discountNum,
        finalPrice: finalPrice,
        stock: stockNum,  // 🔥 STOCK GUARDADO
        category: product.category,
        description: product.description,
        images: updatedImages,
        cover: coverImage,
      });

      alert("Producto actualizado ✔");
      navigate("/admin/products");
    } catch (err) {
      console.error("Error guardando:", err);
      alert("Error al guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: 20 }}>Cargando producto...</p>;

  // ============================================================
  // ⭐ 6️⃣ Render del formulario
  // ============================================================
  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <h1>Editar Producto</h1>

        <form className="admin-form" onSubmit={(e) => e.preventDefault()}>
          <label>Nombre</label>
          <input name="name" value={product.name} onChange={handleChange} />

          <label>Precio</label>
          <input
            name="price"
            type="number"
            value={product.price}
            onChange={handleChange}
          />

          <label>Descuento (%)</label>
          <input
            name="discount"
            type="number"
            min="0"
            max="90"
            value={product.discount}
            onChange={handleChange}
          />

          {/* 🔥 NUEVO CAMPO STOCK */}
          <label>Stock disponible</label>
          <input
            name="stock"
            type="number"
            min="0"
            value={product.stock}
            onChange={handleChange}
          />

          <label>Categoría</label>
          <input
            name="category"
            value={product.category}
            onChange={handleChange}
          />

          <label>Descripción</label>
          <textarea
            name="description"
            value={product.description}
            onChange={handleChange}
          ></textarea>

          <label>Imágenes actuales</label>
          <div className="admin-image-grid">
            {product.images.map((img, i) => (
              <div key={i} className="admin-image-box">
                <img src={img.imageUrl} className="admin-image-preview" />
                <button
                  type="button"
                  className="admin-delete-img"
                  onClick={() => handleDeleteImage(img)}
                >
                  eliminar
                </button>
              </div>
            ))}
          </div>

          <label>Agregar nuevas imágenes</label>
          <input type="file" accept="image/*" multiple onChange={handleNewImages} />

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
