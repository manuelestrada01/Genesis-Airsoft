import React from "react";
import "./ConfirmDialog.css";

export default function ConfirmDialog({ isOpen, title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", onConfirm, onCancel, danger = false }) {
  if (!isOpen) return null;

  return (
    <div className="cdialog-overlay" onClick={onCancel}>
      <div className="cdialog" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="cdialog-title">{title}</h3>}
        {message && <p className="cdialog-message">{message}</p>}
        <div className="cdialog-actions">
          <button className="cdialog-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button className={`cdialog-confirm ${danger ? "cdialog-confirm--danger" : ""}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
