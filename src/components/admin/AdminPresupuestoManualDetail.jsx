import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection, doc, getDoc, addDoc, updateDoc,
  serverTimestamp, runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import AdminSidebar from "./AdminSidebar";
import { generatePresupuestoManualPDF } from "../../utils/generatePresupuestoManualPDF";
import "./admin.css";

const DEFAULT_ITEM = { descripcion: "", tipo: "Mano de obra", cantidad: 1, precioUnitario: 0, subtotal: 0 };

const TIPO_OPTIONS = ["Mano de obra", "Repuesto + M.O.", "Repuesto", "Otro"];

export default function AdminPresupuestoManualDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "nuevo";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [presupuesto, setPresupuesto] = useState(null);

  // Form state
  const [cliente, setCliente] = useState({ nombre: "", email: "", telefono: "" });
  const [descripcion, setDescripcion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [formaDePago, setFormaDePago] = useState("");
  const [status, setStatus] = useState("borrador");
  const [items, setItems] = useState([{ ...DEFAULT_ITEM }]);
  const [descuentoPercent, setDescuentoPercent] = useState(0);

  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "presupuestosManuales", id));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setPresupuesto(data);
          setCliente(data.cliente || { nombre: "", email: "", telefono: "" });
          setDescripcion(data.descripcion || "");
          setObservaciones(data.observaciones || "");
          setFormaDePago(data.formaDePago || "");
          setStatus(data.status || "borrador");
          setItems(data.items?.length > 0 ? data.items : [{ ...DEFAULT_ITEM }]);
          setDescuentoPercent(data.descuentoPercent || 0);
        }
      } catch (err) {
        console.error(err);
        setMessage("Error al cargar presupuesto.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew]);

  // ── Item handlers ──
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      item.subtotal = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
      next[index] = item;
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...DEFAULT_ITEM }]);

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Drag & drop reorder ──
  const dragIndex = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(null);

  const handleDragStart = (e, index) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === index) { setDragOver(null); return; }
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOver(null);
  };

  const calcSubtotal = () => items.reduce((s, item) => s + Number(item.subtotal || 0), 0);
  const calcTotal = () => {
    const sub = calcSubtotal();
    const disc = Number(descuentoPercent || 0);
    return disc > 0 ? Math.round(sub * (1 - disc / 100)) : sub;
  };

  // ── Presupuesto number ──
  const getNextPresupuestoManualNumber = async () => {
    let numero = "";
    const configRef = doc(db, "servicioConfig", "default");
    await runTransaction(db, async (t) => {
      const cfgSnap = await t.get(configRef);
      const next = cfgSnap.data()?.nextPresupuestoManualNumber || 1;
      numero = `PM-${String(next).padStart(4, "0")}`;
      t.update(configRef, {
        nextPresupuestoManualNumber: next + 1,
        updatedAt: serverTimestamp(),
      });
    });
    return numero;
  };

  // ── Save ──
  const handleSave = async () => {
    if (!cliente.nombre.trim()) {
      setMessage("El nombre del cliente es obligatorio.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const subtotal = calcSubtotal();
      const totalAPagar = calcTotal();

      if (isNew) {
        const numero = await getNextPresupuestoManualNumber();
        const newDoc = {
          numero,
          cliente,
          descripcion,
          observaciones,
          formaDePago,
          status,
          items,
          subtotal,
          descuentoPercent: Number(descuentoPercent),
          totalAPagar,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const ref = await addDoc(collection(db, "presupuestosManuales"), newDoc);
        setPresupuesto({ id: ref.id, ...newDoc, numero });
        setMessage(`Presupuesto ${numero} guardado correctamente.`);
        navigate(`/admin/presupuestos-manuales/${ref.id}`, { replace: true });
      } else {
        const updates = {
          cliente,
          descripcion,
          observaciones,
          formaDePago,
          status,
          items,
          subtotal,
          descuentoPercent: Number(descuentoPercent),
          totalAPagar,
          updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, "presupuestosManuales", id), updates);
        setPresupuesto((prev) => ({ ...prev, ...updates }));
        setMessage("Presupuesto actualizado correctamente.");
      }
    } catch (err) {
      setMessage("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── PDF ──
  const handlePDF = () => {
    const data = {
      numero: presupuesto?.numero || "BORRADOR",
      cliente,
      descripcion,
      observaciones,
      formaDePago,
      status,
      items,
      subtotal: calcSubtotal(),
      descuentoPercent: Number(descuentoPercent),
      totalAPagar: calcTotal(),
    };
    generatePresupuestoManualPDF(data);
  };

  if (loading) {
    return (
      <div className="admin-container">
        <AdminSidebar />
        <div className="admin-content">
          <p style={{ color: "#555", fontSize: 14 }}>Cargando...</p>
        </div>
      </div>
    );
  }

  const subtotal = calcSubtotal();
  const total = calcTotal();

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        {/* Back link */}
        <a
          href="#"
          className="af-back-link"
          onClick={(e) => { e.preventDefault(); navigate("/admin/presupuestos-manuales"); }}
        >
          ← Presupuestos Manuales
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, marginBottom: 4 }}>
          <h1 style={{ color: "#fff", margin: 0, fontSize: 24, fontWeight: 800 }}>
            {isNew ? "Nuevo Presupuesto" : (presupuesto?.numero || "Presupuesto")}
          </h1>
          {!isNew && (
            <span style={{
              padding: "3px 12px",
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.8,
              background: status === "enviado" ? "#2563eb1a" : "#d977061a",
              color: status === "enviado" ? "#2563eb" : "#d97706",
              border: `1px solid ${status === "enviado" ? "#2563eb55" : "#d9770655"}`,
            }}>
              {status === "enviado" ? "ENVIADO" : "BORRADOR"}
            </span>
          )}
        </div>

        {message && (
          <div className={`af-msg ${message.startsWith("Error") ? "af-msg--error" : "af-msg--success"}`}>
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
          {/* ── Main form ── */}
          <div>
            {/* Datos del cliente */}
            <section className="af-section">
              <h2 className="af-section-title">Datos del cliente</h2>
              <div className="af-row">
                <div className="af-field">
                  <label className="af-label">Nombre *</label>
                  <input
                    className="af-input"
                    value={cliente.nombre}
                    onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="af-field">
                  <label className="af-label">Teléfono</label>
                  <input
                    className="af-input"
                    value={cliente.telefono}
                    onChange={(e) => setCliente((c) => ({ ...c, telefono: e.target.value }))}
                    placeholder="+54 11 ..."
                  />
                </div>
              </div>
              <div className="af-field">
                <label className="af-label">Email</label>
                <input
                  className="af-input"
                  type="email"
                  value={cliente.email}
                  onChange={(e) => setCliente((c) => ({ ...c, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>
            </section>

            {/* Descripción */}
            <section className="af-section" style={{ marginTop: 20 }}>
              <h2 className="af-section-title">Descripción del presupuesto</h2>
              <div className="af-field">
                <label className="af-label">¿Para qué es este presupuesto?</label>
                <textarea
                  className="af-textarea"
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Reparación de gearbox AEG, cambio de motor y spring..."
                />
              </div>
            </section>

            {/* Items */}
            <section className="af-section" style={{ marginTop: 20 }}>
              <h2 className="af-section-title">Ítems del presupuesto</h2>
              <div className="pm-items-table">
                <div className="pm-items-header">
                  <span style={{ flex: "0 0 20px" }} />
                  <span style={{ flex: "0 0 36px" }}>#</span>
                  <span style={{ flex: 3 }}>Descripción</span>
                  <span style={{ flex: "0 0 120px" }}>Tipo</span>
                  <span style={{ flex: "0 0 60px", textAlign: "center" }}>Cant.</span>
                  <span style={{ flex: "0 0 100px", textAlign: "right" }}>P. Unit.</span>
                  <span style={{ flex: "0 0 100px", textAlign: "right" }}>Subtotal</span>
                  <span style={{ flex: "0 0 32px" }} />
                </div>
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="pm-item-row"
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    style={{
                      opacity: dragIndex.current === i ? 0.4 : 1,
                      borderTop: dragOver === i && dragIndex.current !== i
                        ? "2px solid #c8f400"
                        : "2px solid transparent",
                      transition: "border-color 0.1s",
                    }}
                  >
                    {/* Drag handle */}
                    <span
                      className="pm-drag-handle"
                      title="Arrastrar para reordenar"
                      onMouseDown={(e) => e.currentTarget.parentElement.setAttribute("draggable", true)}
                    >
                      ⠿
                    </span>
                    <span className="pm-item-num">{String(i + 1).padStart(2, "0")}</span>
                    <input
                      className="af-input pm-item-desc"
                      placeholder="Descripción..."
                      value={item.descripcion}
                      onChange={(e) => handleItemChange(i, "descripcion", e.target.value)}
                    />
                    <select
                      className="af-select pm-item-tipo"
                      value={item.tipo}
                      onChange={(e) => handleItemChange(i, "tipo", e.target.value)}
                    >
                      {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      className="af-input pm-item-cant"
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(i, "cantidad", e.target.value)}
                    />
                    <input
                      className="af-input pm-item-price"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.precioUnitario}
                      onChange={(e) => handleItemChange(i, "precioUnitario", e.target.value)}
                    />
                    <span className="pm-item-subtotal">
                      ${Number(item.subtotal || 0).toLocaleString("es-AR")}
                    </span>
                    <button
                      className="pm-item-remove"
                      onClick={() => removeItem(i)}
                      title="Quitar ítem"
                      disabled={items.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button className="pm-add-item" onClick={addItem}>
                  + Agregar ítem
                </button>
              </div>
            </section>

            {/* Forma de pago + Observaciones */}
            <section className="af-section" style={{ marginTop: 20 }}>
              <div className="af-row">
                <div className="af-field">
                  <label className="af-label">Forma de pago</label>
                  <input
                    className="af-input"
                    value={formaDePago}
                    onChange={(e) => setFormaDePago(e.target.value)}
                    placeholder="Efectivo, transferencia..."
                  />
                </div>
                <div className="af-field">
                  <label className="af-label">Estado</label>
                  <select
                    className="af-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="borrador">Borrador</option>
                    <option value="enviado">Enviado al cliente</option>
                  </select>
                </div>
              </div>
              <div className="af-field">
                <label className="af-label">Observaciones</label>
                <textarea
                  className="af-textarea"
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>
            </section>
          </div>

          {/* ── Sidebar: Totals + Actions ── */}
          <div className="pm-sidebar-panel">
            <h3 className="pm-panel-title">Resumen</h3>

            <div className="pm-total-row">
              <span>Subtotal</span>
              <strong>${subtotal.toLocaleString("es-AR")}</strong>
            </div>

            <div className="pm-total-row" style={{ alignItems: "center" }}>
              <span>Descuento (%)</span>
              <input
                className="af-input pm-discount-input"
                type="number"
                min="0"
                max="100"
                value={descuentoPercent}
                onChange={(e) => setDescuentoPercent(e.target.value)}
              />
            </div>

            <div className="pm-total-final">
              <span>Total a pagar</span>
              <strong>${total.toLocaleString("es-AR")}</strong>
            </div>

            <div className="pm-panel-actions">
              <button
                className="af-save-btn"
                onClick={handleSave}
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving ? "Guardando..." : isNew ? "Crear presupuesto" : "Guardar cambios"}
              </button>
              <button
                className="pm-pdf-btn"
                onClick={handlePDF}
                style={{ width: "100%" }}
              >
                Descargar PDF
              </button>
            </div>

            {!isNew && presupuesto?.numero && (
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Número: </span>
                <strong style={{ color: "#c8f400", fontSize: 14 }}>{presupuesto.numero}</strong>
              </div>
            )}

            {/* Live preview */}
            <div style={{ marginTop: 24 }}>
              <p style={{
                color: "#555", fontSize: 10, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: 0.5,
                margin: "0 0 10px",
              }}>
                Vista previa
              </p>
              <PresupuestoManualPreview
                numero={presupuesto?.numero || "BORRADOR"}
                cliente={cliente}
                descripcion={descripcion}
                observaciones={observaciones}
                formaDePago={formaDePago}
                items={items}
                subtotal={subtotal}
                descuentoPercent={Number(descuentoPercent)}
                total={total}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Live Preview ───────────────────────────────────────────────────────────────
function PresupuestoManualPreview({
  numero, cliente, descripcion, observaciones,
  formaDePago, items, subtotal, descuentoPercent, total,
}) {
  const fecha = new Date().toLocaleDateString("es-AR");

  const s = {
    label:  { fontSize: 7.5, color: "#777", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 },
    value:  { fontSize: 8, color: "#111", fontWeight: 600, textAlign: "right", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    row:    { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 5px", gap: 4 },
    secHdr: { background: "#228b22", color: "#fff", fontSize: 7, fontWeight: 800, padding: "3px 5px", letterSpacing: 0.3, textTransform: "uppercase" },
  };

  const PreviewRow = ({ label, value, alt }) => (
    <div style={{ ...s.row, background: alt ? "#f5f5f5" : "#fff" }}>
      <span style={s.label}>{label}</span>
      <span style={s.value}>{value || "—"}</span>
    </div>
  );

  const visibleItems = [...items, ...Array(Math.max(0, 3 - items.length)).fill(null)];

  return (
    <div style={{
      background: "#fff",
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      fontSize: 9,
      fontFamily: "helvetica, sans-serif",
      border: "1px solid #ddd",
    }}>
      {/* Header */}
      <div style={{
        background: "#0f0f0f",
        padding: "8px 10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 13, lineHeight: 1 }}>GENESIS</div>
          <div style={{ color: "#c8f400", fontWeight: 900, fontSize: 13, lineHeight: 1 }}>AIRSOFT</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 11 }}>PRESUPUESTO</div>
          <div style={{ color: "#c8f400", fontSize: 7, fontStyle: "italic" }}>PRESUPUESTO MANUAL</div>
          <div style={{ color: "#888", fontSize: 6.5 }}>genesisairsoft.com.ar</div>
        </div>
      </div>
      <div style={{ height: 2, background: "#228b22" }} />

      {/* Two-col info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ borderRight: "1px solid #eee" }}>
          <div style={s.secHdr}>Datos del presupuesto</div>
          {[
            ["N°", numero, true],
            ["Fecha", fecha, false],
            ["Válido", "15 días", true],
            ["Pago", formaDePago, false],
          ].map(([l, v, a]) => <PreviewRow key={l} label={l} value={v} alt={a} />)}
        </div>
        <div>
          <div style={s.secHdr}>Datos del cliente</div>
          {[
            ["Cliente", cliente.nombre, true],
            ["Teléfono", cliente.telefono, false],
            ["Email", cliente.email, true],
          ].map(([l, v, a]) => <PreviewRow key={l} label={l} value={v} alt={a} />)}
        </div>
      </div>

      {/* Descripción */}
      <div style={s.secHdr}>Descripción del presupuesto</div>
      <div style={{
        background: "#fafafa", padding: "4px 5px",
        fontSize: 7.5, color: "#333", lineHeight: 1.4, minHeight: 18,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}>
        {descripcion || "—"}
      </div>

      {/* Observaciones */}
      <div style={s.secHdr}>Observaciones</div>
      <div style={{ background: "#fafafa", padding: "4px 5px", fontSize: 7.5, color: "#333", lineHeight: 1.4, minHeight: 14 }}>
        {observaciones || "—"}
      </div>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#228b22" }}>
            {["#", "Descripción", "Tipo", "Cant.", "P.Unit.", "Sub."].map((h) => (
              <th key={h} style={{ padding: "3px 3px", color: "#fff", fontSize: 6.5, fontWeight: 800, textAlign: "left" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8f8f8", borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "2px 3px", color: "#999", fontSize: 6.5, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</td>
              <td style={{ padding: "2px 3px", fontSize: 6.5, color: "#222", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item?.descripcion || ""}</td>
              <td style={{ padding: "2px 3px", fontSize: 6.5, color: "#888", fontStyle: "italic", whiteSpace: "nowrap" }}>{item?.tipo || ""}</td>
              <td style={{ padding: "2px 3px", fontSize: 6.5, color: "#222" }}>{item?.cantidad || ""}</td>
              <td style={{ padding: "2px 3px", fontSize: 6.5, color: "#222" }}>{item?.precioUnitario ? `$${Number(item.precioUnitario).toLocaleString("es-AR")}` : ""}</td>
              <td style={{ padding: "2px 3px", fontSize: 6.5, color: "#222", fontWeight: 700 }}>{item?.subtotal ? `$${Number(item.subtotal).toLocaleString("es-AR")}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", background: "#f5f5f5", borderTop: "1px solid #ddd" }}>
        <div style={{ minWidth: 130, padding: "5px 7px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#666", padding: "2px 0" }}>
            <span>Subtotal</span>
            <span>${Number(subtotal).toLocaleString("es-AR")}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#666", padding: "2px 0" }}>
            <span>Descuento</span>
            <span>{descuentoPercent}%</span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            background: "#228b22", color: "#fff",
            fontSize: 8, fontWeight: 800,
            padding: "3px 5px", margin: "3px -7px -5px",
          }}>
            <span>TOTAL</span>
            <span>${Number(total).toLocaleString("es-AR")}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#f0f0f0", padding: "4px 8px", textAlign: "center", fontSize: 6, color: "#999" }}>
        genesisairsoft.com.ar · @genesis.airsoft · Buenos Aires, Argentina
      </div>
    </div>
  );
}
