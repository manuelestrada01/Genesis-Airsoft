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

      const cleanHTML = sanitizeHTML(product.description);

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
            <select name="category" value={product.category || ""} onChange={handleChange}>
              <option value="">Seleccioná…</option>
              <option value="Insumos">Insumos</option>
              <option value="Marcadoras AEG">Marcadoras AEG</option>
              <option value="Accesorios">Accesorios</option>
              <option value="Indumentaria">Indumentaria</option>
              <option value="Marcadoras GBB">Marcadoras GBB</option>
              <option value="Magazines">Magazines</option>
            </select>


          <label>Descripción (HTML permitido)</label>
          <textarea
            name="description"
            value={product.description}
            onChange={handleChange}
            style={{ minHeight: "180px" }}
          />

          <label>Pausar publicación</label>
          <input
            type="checkbox"
            name="paused"
            checked={product.paused}
            onChange={handleChange}
          />

          <label>Imágenes actuales</label>
          <div className="admin-image-grid">
            {product.images.map((img, i) => (
              <div key={i} className="admin-image-box">
                <img src={img.imageUrl} className="admin-image-preview" alt="" />
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
