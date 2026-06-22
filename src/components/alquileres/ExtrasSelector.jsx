import React from "react";

export default function ExtrasSelector({ extras, selected, onToggle }) {
  return (
    <div className="rf-extras">
      <h3 className="rf-section-title">Extras opcionales</h3>
      <p className="rf-section-sub">Los extras se abonan el día de la partida (no se suman a la seña)</p>

      <div className="rf-extras-list">
        {extras.map((extra) => {
          const isChecked = selected.includes(extra.id);
          return (
            <label key={extra.id} className={`rf-extra-item ${isChecked ? "rf-extra-item--active" : ""}`}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(extra.id)}
                style={{ display: "none" }}
              />
              <div className="rf-extra-check">{isChecked ? "✓" : ""}</div>
              <div className="rf-extra-info">
                <span className="rf-extra-name">{extra.name}</span>
                <span className="rf-extra-price">${Number(extra.price).toLocaleString("es-AR")}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
