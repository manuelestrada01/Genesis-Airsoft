// AdminProducts.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";

import AdminSidebar from "./AdminSidebar";
import "./admin.css";
import { Link } from "react-router-dom";
import { deleteProductImage } from "../../firebase/uploadProductImage";

// ============================================================
// Modal genérico dark
// ============================================================
function AdminModal({ modal, onClose }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (modal?.type === "discount-input" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [modal]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!modal) return null;

  // ── Input de porcentaje ──────────────────────────────────
  if (modal.type === "discount-input") {
    const handleConfirm = () => {
      const val = Number(inputRef.current?.value ?? "");
      if (isNaN(val) || val < 0 || val > 90) {
        inputRef.current?.classList.add("ap-modal-input--error");
        inputRef.current?.focus();
        return;
      }
      onClose({ confirmed: true, discount: val });
    };

    return (
      <div className="ap-modal-overlay" onClick={() => onClose(null)}>
        <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="ap-modal-title">Aplicar descuento</h3>
          <p className="ap-modal-desc">
            Ingresá el porcentaje para{" "}
            <strong>{modal.count}</strong> producto
            {modal.count > 1 ? "s" : ""} seleccionado
            {modal.count > 1 ? "s" : ""}
          </p>

          <div className="ap-modal-input-wrap">
            <input
              ref={inputRef}
              type="number"
              min="0"
              max="90"
              step="1"
              placeholder="Ej: 15"
              className="ap-modal-input"
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              onChange={() => inputRef.current?.classList.remove("ap-modal-input--error")}
            />
            <span className="ap-modal-input-suffix">%</span>
          </div>
          <p className="ap-modal-hint">Valor entre 0 y 90</p>

          <div className="ap-modal-actions">
            <button className="ap-modal-btn-primary" onClick={handleConfirm}>
              Aplicar
            </button>
            <button className="ap-modal-btn-ghost" onClick={() => onClose(null)}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmar quitar descuento ────────────────────────────
  if (modal.type === "confirm-remove") {
    return (
      <div className="ap-modal-overlay" onClick={() => onClose(null)}>
        <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="ap-modal-title">Quitar descuento</h3>
          <p className="ap-modal-desc">
            Se quitará el descuento a{" "}
            <strong>{modal.count}</strong> producto
            {modal.count > 1 ? "s" : ""} seleccionado
            {modal.count > 1 ? "s" : ""}.
            <br />
            El precio volverá al valor original.
          </p>
          <div className="ap-modal-actions">
            <button
              className="ap-modal-btn-danger"
              onClick={() => onClose({ confirmed: true })}
            >
              Quitar descuento
            </button>
            <button className="ap-modal-btn-ghost" onClick={() => onClose(null)}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmar acción genérica (pausar todos, etc.) ────────
  if (modal.type === "confirm") {
    return (
      <div className="ap-modal-overlay" onClick={() => onClose(null)}>
        <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="ap-modal-title">{modal.title}</h3>
          {modal.desc && <p className="ap-modal-desc">{modal.desc}</p>}
          <div className="ap-modal-actions">
            <button
              className={modal.danger ? "ap-modal-btn-danger" : "ap-modal-btn-primary"}
              onClick={() => onClose({ confirmed: true })}
            >
              {modal.confirmLabel ?? "Confirmar"}
            </button>
            <button className="ap-modal-btn-ghost" onClick={() => onClose(null)}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Toast / info ─────────────────────────────────────────
  if (modal.type === "info") {
    return (
      <div className="ap-modal-overlay" onClick={() => onClose(null)}>
        <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
          <h3 className="ap-modal-title">{modal.title}</h3>
          {modal.desc && <p className="ap-modal-desc">{modal.desc}</p>}
          <div className="ap-modal-actions">
            <button className="ap-modal-btn-primary" onClick={() => onClose(null)}>
              Aceptar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================
// Componente principal
// ============================================================
export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modal, setModal] = useState(null);

  // Promesa que resuelve el modal activo
  const modalResolveRef = useRef(null);

  const showModal = (config) =>
    new Promise((resolve) => {
      modalResolveRef.current = resolve;
      setModal(config);
    });

  const handleModalClose = (result) => {
    setModal(null);
    modalResolveRef.current?.(result);
    modalResolveRef.current = null;
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============================================================
  // 1️⃣ Cargar todos los productos
  // ============================================================
  useEffect(() => {
    const loadAll = async () => {
      try {
        const ref = collection(db, "products");
        const q = query(ref, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setProducts(items);
      } catch (err) {
        console.error("❌ Error cargando productos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  // ============================================================
  // 2️⃣ Eliminar producto
  // ============================================================
  const handleDelete = async (product) => {
    const result = await showModal({
      type: "confirm",
      title: "Eliminar producto",
      desc: `¿Seguro que deseas eliminar "${product.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });

    if (!result?.confirmed) return;

    try {
      if (product.images && Array.isArray(product.images)) {
        for (const img of product.images) {
          if (img.imagePath) await deleteProductImage(img.imagePath);
        }
      }

      await deleteDoc(doc(db, "products", product.id));

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });

      await showModal({
        type: "info",
        title: "Producto eliminado",
        desc: "El producto fue eliminado correctamente.",
      });
    } catch (error) {
      console.error("❌ Error eliminando producto:", error);
      await showModal({ type: "info", title: "Error", desc: "No se pudo eliminar el producto." });
    }
  };

  // ============================================================
  // 3️⃣ Pausar / Activar un solo producto
  // ============================================================
  const togglePause = async (product) => {
    try {
      const ref = doc(db, "products", product.id);
      await updateDoc(ref, { paused: !product.paused });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, paused: !p.paused } : p
        )
      );
    } catch (err) {
      console.error("❌ Error cambiando estado de pausa:", err);
      await showModal({ type: "info", title: "Error", desc: "No se pudo actualizar el estado." });
    }
  };

  // ============================================================
  // 4️⃣ Pausar o activar TODOS
  // ============================================================
  const togglePauseAll = async (pauseValue) => {
    const result = await showModal({
      type: "confirm",
      title: pauseValue ? "Pausar todas las publicaciones" : "Activar todas las publicaciones",
      desc: pauseValue
        ? "Todos los productos dejarán de ser visibles en la tienda."
        : "Todos los productos volverán a ser visibles en la tienda.",
      confirmLabel: pauseValue ? "Pausar TODOS" : "Activar TODOS",
      danger: pauseValue,
    });

    if (!result?.confirmed) return;

    try {
      setBulkLoading(true);

      const batch = writeBatch(db);
      products.forEach((p) => {
        const ref = doc(db, "products", p.id);
        batch.update(ref, { paused: pauseValue });
      });

      await batch.commit();

      setProducts((prev) => prev.map((p) => ({ ...p, paused: pauseValue })));
    } catch (err) {
      console.error("❌ Error en pausa masiva:", err);
      await showModal({ type: "info", title: "Error", desc: "No se pudieron actualizar las publicaciones." });
    } finally {
      setBulkLoading(false);
    }
  };

  // ============================================================
  // 5️⃣ Selección
  // ============================================================
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ============================================================
  // 6️⃣ Aplicar descuento a seleccionados
  // ============================================================
  const applyBulkDiscount = async () => {
    if (selectedIds.size === 0) return;

    const result = await showModal({
      type: "discount-input",
      count: selectedIds.size,
    });

    if (!result?.confirmed) return;

    const { discount } = result;

    try {
      setBulkLoading(true);

      const batch = writeBatch(db);
      const selectedList = products.filter((p) => selectedIds.has(p.id));

      selectedList.forEach((p) => {
        const price = Number(p.price || 0);
        const finalPrice = Number((price - (price * discount) / 100).toFixed(2));
        batch.update(doc(db, "products", p.id), { discount, finalPrice });
      });

      await batch.commit();

      setProducts((prev) =>
        prev.map((p) => {
          if (!selectedIds.has(p.id)) return p;
          const price = Number(p.price || 0);
          const finalPrice = Number((price - (price * discount) / 100).toFixed(2));
          return { ...p, discount, finalPrice };
        })
      );

      setSelectedIds(new Set());

      await showModal({
        type: "info",
        title: "Descuento aplicado",
        desc: `Se aplicó ${discount}% de descuento a ${selectedList.length} producto${selectedList.length > 1 ? "s" : ""}.`,
      });
    } catch (err) {
      console.error("❌ Error aplicando descuento:", err);
      await showModal({ type: "info", title: "Error", desc: "No se pudo aplicar el descuento." });
    } finally {
      setBulkLoading(false);
    }
  };

  // ============================================================
  // 7️⃣ Quitar descuento a seleccionados
  // ============================================================
  const removeBulkDiscount = async () => {
    if (selectedIds.size === 0) return;

    const result = await showModal({
      type: "confirm-remove",
      count: selectedIds.size,
    });

    if (!result?.confirmed) return;

    try {
      setBulkLoading(true);

      const batch = writeBatch(db);
      const selectedList = products.filter((p) => selectedIds.has(p.id));

      selectedList.forEach((p) => {
        const price = Number(p.price || 0);
        batch.update(doc(db, "products", p.id), { discount: 0, finalPrice: price });
      });

      await batch.commit();

      setProducts((prev) =>
        prev.map((p) =>
          selectedIds.has(p.id)
            ? { ...p, discount: 0, finalPrice: Number(p.price || 0) }
            : p
        )
      );

      setSelectedIds(new Set());

      await showModal({
        type: "info",
        title: "Descuento eliminado",
        desc: `Se quitó el descuento a ${selectedList.length} producto${selectedList.length > 1 ? "s" : ""}.`,
      });
    } catch (err) {
      console.error("❌ Error quitando descuento:", err);
      await showModal({ type: "info", title: "Error", desc: "No se pudo quitar el descuento." });
    } finally {
      setBulkLoading(false);
    }
  };

  // ============================================================
  // 8️⃣ Render
  // ============================================================
  if (loading) return <p style={{ padding: 20, color: "var(--text-muted)" }}>Cargando productos...</p>;

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="admin-container">
      <AdminSidebar />

      <AdminModal modal={modal} onClose={handleModalClose} />

      <div className="admin-content">
        <h1>Productos</h1>

        <div className="ap-toolbar">
          <input
            className="ap-search"
            placeholder="Buscar por nombre o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="ap-toolbar-right">
            <button
              onClick={() => togglePauseAll(true)}
              disabled={bulkLoading}
              className="ap-bulk-btn ap-bulk-pause"
            >
              Pausar TODOS
            </button>
            <button
              onClick={() => togglePauseAll(false)}
              disabled={bulkLoading}
              className="ap-bulk-btn ap-bulk-activate"
            >
              Activar TODOS
            </button>
            <Link to="/admin/products/add" className="ap-add-btn">
              + Agregar
            </Link>
          </div>
        </div>

        {/* Barra de acciones sobre selección */}
        <div className="ap-selection-bar">
          <span className="ap-selection-count">
            {hasSelection
              ? `${selectedIds.size} seleccionado${selectedIds.size > 1 ? "s" : ""}`
              : "Seleccioná productos con el checkbox"}
          </span>
          <div className="ap-selection-actions">
            <button
              className="ap-bulk-btn ap-bulk-discount"
              disabled={!hasSelection || bulkLoading}
              onClick={applyBulkDiscount}
            >
              % Aplicar descuento
            </button>
            <button
              className="ap-bulk-btn ap-bulk-nodiscount"
              disabled={!hasSelection || bulkLoading}
              onClick={removeBulkDiscount}
            >
              Quitar descuento
            </button>
            {hasSelection && (
              <button
                className="ap-bulk-btn ap-bulk-clear"
                onClick={() => setSelectedIds(new Set())}
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>

        {filteredProducts.length === 0 && (
          <p className="ap-empty">Sin resultados.</p>
        )}

        <div className="ap-grid">
          {filteredProducts.map((p) => {
            const img = p.cover || p.images?.[0]?.imageUrl || p.image || "";
            const isSelected = selectedIds.has(p.id);

            return (
              <div
                key={p.id}
                className={`ap-card${p.paused ? " ap-card--paused" : ""}${isSelected ? " ap-card--selected" : ""}`}
              >
                <div className="ap-card-img-wrap">
                  <img src={img} alt={p.name} className="ap-card-img" />
                  {p.paused && (
                    <span className="ap-card-badge-paused">PAUSADO</span>
                  )}
                  <label className="ap-card-checkbox-wrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="ap-card-checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                    />
                    <span className="ap-card-checkbox-mark" />
                  </label>
                </div>

                <div className="ap-card-body">
                  <span className="ap-card-category">{p.category}</span>
                  <p className="ap-card-name">{p.name}</p>
                  <div className="ap-card-meta">
                    {p.discount > 0 ? (
                      <>
                        <span className="ap-card-price ap-card-price--final">
                          ${Number(p.finalPrice || p.price).toLocaleString("es-AR")}
                        </span>
                        <span className="ap-card-price--original">
                          ${Number(p.price).toLocaleString("es-AR")}
                        </span>
                        <span className="ap-card-discount-badge">-{p.discount}%</span>
                      </>
                    ) : (
                      <span className="ap-card-price">${Number(p.price).toLocaleString("es-AR")}</span>
                    )}
                    <span className="ap-card-stock">Stock: {p.stock ?? 0}</span>
                  </div>
                </div>

                <div className="ap-card-actions">
                  <button
                    className="ap-action-btn ap-action-toggle"
                    onClick={() => togglePause(p)}
                  >
                    {p.paused ? "Activar" : "Pausar"}
                  </button>
                  <Link
                    to={`/admin/products/edit/${p.id}`}
                    className="ap-action-btn ap-action-edit"
                  >
                    Editar
                  </Link>
                  <button
                    className="ap-action-btn ap-action-delete"
                    onClick={() => handleDelete(p)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
