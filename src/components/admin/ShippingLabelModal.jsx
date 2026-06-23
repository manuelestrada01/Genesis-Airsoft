import React, { useState } from "react";
import { generateShippingLabel } from "../../utils/generateShippingLabel";
import "./ShippingLabelModal.css";

export const SENDERS = [
  { name: "Manuel Estrada",   dni: "42933132", tel: "1130441967" },
  { name: "Facundo Estrada",  dni: "46960694", tel: "1130441967" },
  { name: "Santiago Estrada", dni: "22201479", tel: "1130441967" },
];

export const ADDRESSES = [
  { label: "Mendoza", city: "Mendoza", street: "Bandera de los Andes 424", zip: "5519" },
  { label: "CABA",    city: "CABA",    street: "Av. Lope de Vega 2814",    zip: "1417" },
];

function LabelPreview({ sender, address, recipient, items, paymentType }) {
  const MIN_ROWS = 10;
  const rows = [...items];
  while (rows.length < MIN_ROWS) rows.push(null);

  return (
    <div className="sl-preview">
      <div className="sl-accent-bar" />

      <div className="sl-brand-row">
        <span className="sl-brand-name">Genesis Airsoft</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {paymentType && (
            <span className={`sl-payment-badge ${paymentType === "Pago en Destino" ? "sl-payment-badge--dest" : ""}`}>
              {paymentType}
            </span>
          )}
          <span className="sl-doc-label">Etiqueta de Despacho</span>
        </div>
      </div>

      <div className="sl-preview-body">
        {/* Remitente */}
        <div className="sl-preview-col">
          <span className="sl-col-header">Remitente</span>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Nombre</span>
            <span className="sl-preview-field-value">{sender.name}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">DNI</span>
            <span className="sl-preview-field-value">{sender.dni}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Ciudad</span>
            <span className="sl-preview-field-value">{address.city}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Cód. Postal</span>
            <span className="sl-preview-field-value">{address.zip}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Tel</span>
            <span className="sl-preview-field-value">{sender.tel}</span>
          </div>
        </div>

        <div className="sl-col-divider" />

        {/* Destinatario */}
        <div className="sl-preview-col">
          <span className="sl-col-header">Destinatario</span>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Nombre</span>
            <span className="sl-preview-field-value">{recipient.name || "—"}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">DNI</span>
            <span className="sl-preview-field-value">{recipient.dni || "—"}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Cód. Postal</span>
            <span className="sl-preview-field-value">{recipient.zip || "—"}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Provincia</span>
            <span className="sl-preview-field-value">{recipient.province || "—"}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Localidad</span>
            <span className="sl-preview-field-value">{recipient.city || "—"}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Dirección</span>
            <span className="sl-preview-field-value">{recipient.street || "—"}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Tel</span>
            <span className="sl-preview-field-value">{recipient.phone || "—"}</span>
          </div>
          <div className="sl-preview-field">
            <span className="sl-preview-field-label">Mail</span>
            <span className="sl-preview-field-value">{recipient.email || "—"}</span>
          </div>
        </div>
      </div>

      <div className="sl-table-section">
        <div className="sl-table-label">Detalle de la Venta</div>
        <table className="sl-preview-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr key={i}>
                <td>{item?.name || ""}</td>
                <td>{item?.quantity ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { LabelPreview };

export default function ShippingLabelModal({ order, isOpen, onClose }) {
  const [selectedSender, setSelectedSender] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState(0);
  const [paymentType, setPaymentType] = useState("Pago en Origen");

  if (!isOpen) return null;

  const sender = SENDERS[selectedSender];
  const address = ADDRESSES[selectedAddress];

  const recipient = {
    name:     order?.buyer?.name || "",
    dni:      order?.buyer?.dni || "",
    zip:      order?.buyer?.zip || "",
    province: order?.buyer?.province || "",
    city:     order?.buyer?.city || "",
    street:   [order?.buyer?.street, order?.buyer?.number].filter(Boolean).join(" "),
    phone:    order?.buyer?.phone || "",
    email:    order?.buyer?.email || "",
  };

  const items = (order?.items || []).map((it) => ({
    name: it.name || "",
    quantity: it.quantity ?? 1,
  }));

  const handleDownload = () => {
    generateShippingLabel(sender, address, recipient, items, order?.id || "manual", paymentType);
  };

  return (
    <div className="sl-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sl-modal">
        <div className="sl-modal-header">
          <h2 className="sl-modal-title">Etiqueta de despacho</h2>
          <button className="sl-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Dropdowns */}
        <div className="sl-controls">
          <div className="sl-control-group">
            <span className="sl-control-label">Remitente</span>
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
          <div className="sl-control-group">
            <span className="sl-control-label">Dirección de despacho</span>
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
          <div className="sl-control-group">
            <span className="sl-control-label">Modalidad de pago</span>
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

        {/* Preview */}
        <div className="sl-preview-wrap">
          <LabelPreview
            sender={sender}
            address={address}
            recipient={recipient}
            items={items}
            paymentType={paymentType}
          />
        </div>

        {/* Actions */}
        <div className="sl-actions">
          <button className="sl-btn-close" onClick={onClose}>Cerrar</button>
          <button className="sl-btn-download" onClick={handleDownload}>
            ↓ Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
