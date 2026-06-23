import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { LabelPreview, SENDERS, ADDRESSES } from "./ShippingLabelModal";
import { generateShippingLabel } from "../../utils/generateShippingLabel";
import "./admin.css";
import "./ShippingLabelModal.css";

const emptyRecipient = () => ({
  name: "", dni: "", zip: "", province: "", city: "", street: "", phone: "", email: "",
});

const emptyItem = () => ({ name: "", quantity: "" });

export default function AdminShippingLabel() {
  const [selectedSender, setSelectedSender] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState(0);
  const [paymentType, setPaymentType] = useState("Pago en Origen");
  const [recipient, setRecipient] = useState(emptyRecipient());
  const [items, setItems] = useState([emptyItem()]);

  const sender = SENDERS[selectedSender];
  const address = ADDRESSES[selectedAddress];

  const handleRecipient = (e) => {
    setRecipient((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleItem = (i, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (i) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleDownload = () => {
    const mappedItems = items
      .filter((it) => it.name.trim())
      .map((it) => ({ name: it.name.trim(), quantity: Number(it.quantity) || 1 }));
    generateShippingLabel(sender, address, recipient, mappedItems, "manual", paymentType);
  };

  const previewItems = items
    .filter((it) => it.name.trim())
    .map((it) => ({ name: it.name, quantity: Number(it.quantity) || 1 }));

  const inputStyle = {
    background: "#111", color: "#fff", border: "1px solid #2a2a2a",
    borderRadius: 8, padding: "9px 12px", fontSize: 13, fontWeight: 600,
    width: "100%", outline: "none", boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 800, color: "#888",
    textTransform: "uppercase", letterSpacing: 0.5,
    display: "block", marginBottom: 5,
  };

  const card = {
    background: "#1a1a1a", border: "1px solid #2a2a2a",
    borderRadius: 14, padding: 20, marginBottom: 20,
  };

  const sectionTitle = {
    color: "#fff", fontSize: 15, fontWeight: 900, margin: "0 0 16px",
  };

  return (
    <div className="admin-container">
      <AdminSidebar />
      <div className="admin-content">
        <h1 style={{ color: "#fff", margin: "0 0 24px" }}>Etiqueta de Despacho Manual</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

          {/* Left: form */}
          <div>
            {/* Remitente selects */}
            <div style={card}>
              <p style={sectionTitle}>Remitente</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <span style={labelStyle}>Quien envía</span>
                  <select
                    className="sl-select"
                    value={selectedSender}
                    onChange={(e) => setSelectedSender(Number(e.target.value))}
                  >
                    {SENDERS.map((s, i) => (
                      <option key={i} value={i}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={labelStyle}>Dirección de despacho</span>
                  <select
                    className="sl-select"
                    value={selectedAddress}
                    onChange={(e) => setSelectedAddress(Number(e.target.value))}
                  >
                    {ADDRESSES.map((a, i) => (
                      <option key={i} value={i}>{a.label} — {a.street}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={labelStyle}>Modalidad de pago</span>
                  <select
                    className="sl-select"
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                  >
                    <option>Pago en Origen</option>
                    <option>Pago en Destino</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Destinatario */}
            <div style={card}>
              <p style={sectionTitle}>Destinatario</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { field: "name",     label: "Nombre" },
                  { field: "dni",      label: "DNI" },
                  { field: "zip",      label: "Código Postal" },
                  { field: "province", label: "Provincia" },
                  { field: "city",     label: "Localidad" },
                  { field: "phone",    label: "Teléfono" },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <span style={labelStyle}>{label}</span>
                    <input
                      style={inputStyle}
                      name={field}
                      value={recipient[field]}
                      onChange={handleRecipient}
                      placeholder={label}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={labelStyle}>Dirección</span>
                  <input
                    style={inputStyle}
                    name="street"
                    value={recipient.street}
                    onChange={handleRecipient}
                    placeholder="Ej: Güemes 2416 (DOMICILIO)"
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={labelStyle}>Email</span>
                  <input
                    style={inputStyle}
                    name="email"
                    type="email"
                    value={recipient.email}
                    onChange={handleRecipient}
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Productos */}
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ ...sectionTitle, margin: 0 }}>Productos</p>
                <button
                  type="button"
                  onClick={addItem}
                  style={{
                    background: "transparent", border: "1px solid #c8f400", color: "#c8f400",
                    borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  + Agregar
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      style={{ ...inputStyle, flex: 3 }}
                      value={item.name}
                      onChange={(e) => handleItem(i, "name", e.target.value)}
                      placeholder="Nombre del producto"
                    />
                    <input
                      style={{ ...inputStyle, flex: 1, textAlign: "center" }}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItem(i, "quantity", e.target.value)}
                      placeholder="Cant."
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        style={{
                          background: "transparent", border: "1px solid #333", color: "#f87171",
                          borderRadius: 8, width: 32, height: 36, cursor: "pointer", fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="sl-btn-download"
              style={{ width: "100%", padding: "13px", fontSize: 14 }}
            >
              ↓ Descargar PDF
            </button>
          </div>

          {/* Right: preview */}
          <div style={{ position: "sticky", top: 20 }}>
            <p style={{ color: "#888", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              Preview
            </p>
            <div className="sl-preview-wrap">
              <LabelPreview
                sender={sender}
                address={address}
                recipient={recipient}
                items={previewItems}
                paymentType={paymentType}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
