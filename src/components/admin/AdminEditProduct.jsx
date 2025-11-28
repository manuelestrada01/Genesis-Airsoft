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

        if (data.images) {
          imagesArray = data.images;
        } else if (data.imageUrl) {
          imagesArray = [
            {
              imageUrl: data.imageUrl,
              imagePath: data.imagePath || "",
            },
          ];
        }

        setProduct({
          id: snap.id,
          ...data,
          images: imagesArray,
          cover: data.cover || imagesArray[0]?.imageUrl || "",
        });

        setLoading(false);
      } catch (err) {
        console.error("Error cargando producto:", err);
      }
    };

    loadProduct();
  }, [id]);

  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleNewImages = (e) => {
    setNewImages(Array.from(e.target.files));
  };

  const handleDeleteImage = async (img) => {
    if (!confirm("¿Eliminar esta imagen?")) return;

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

  const handleSave = async () => {
    if (!product) return;

    if (!confirm("¿Guardar cambios?")) return;

    setSaving(true);

    try {
      const ref = doc(db, "products", product.id);

      let updatedImages = [...product.images];

      if (newImages.length > 0) {
        const uploaded = await uploadMultipleImages(newImages, product.id);
        updatedImages = [...updatedImages, ...uploaded];
      }

      const newCover =
        updatedImages.length > 0 ? updatedImages[0].imageUrl : "";

      await updateDoc(ref, {
        name: product.name,
        price: Number(product.price),
        category: product.category,
        description: product.description,
        tag: product.tag || "",       // ← NUEVO
        images: updatedImages,
        cover: newCover,
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

  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <h1>Editar Producto</h1>

        <form className="admin-form" onSubmit={(e) => e.preventDefault()}>

          <label>Nombre</label>
          <input name="name" value={product.name} onChange={handleChange} />

          <label>Precio</label>
          <input name="price" type="number" value={product.price} onChange={handleChange} />

          <label>Categoría</label>
          <input name="category" value={product.category} onChange={handleChange} />

          <label>Descripción</label>
          <textarea name="description" value={product.description} onChange={handleChange}></textarea>

          {/* TAG MODIFY */}
          <label>Etiqueta (opcional)</label>
          <select name="tag" value={product.tag || ""} onChange={handleChange}>
            <option value="">Sin etiqueta</option>
            <option value="hot">🔥 Hot</option>
            <option value="new">🆕 Nuevo</option>
            <option value="sale">💸 Oferta</option>
            <option value="limited">⭐ Limited</option>
          </select>

          <label>Imágenes actuales</label>
          <div className="admin-image-grid">
            {product.images.map((img, i) => (
              <div key={i} className="admin-image-box">
                <img src={img.imageUrl} alt="img" className="admin-image-preview" />
                <button type="button" className="admin-delete-img" onClick={() => handleDeleteImage(img)}>
                  eliminar
                </button>
              </div>
            ))}
          </div>

          <label>Agregar nuevas imágenes</label>
          <input type="file" accept="image/*" multiple onChange={handleNewImages} />

          <button type="button" className="admin-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
