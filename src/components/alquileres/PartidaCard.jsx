import React from "react";
import { useNavigate } from "react-router-dom";
import "./AlquileresPage.css";

export default function PartidaCard({ partida, basePrice }) {
  const navigate = useNavigate();

  const horario = partida.horario?.toDate
    ? partida.horario.toDate()
    : new Date(partida.horario);

  const dateStr = horario.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeStr = horario.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const slotsAvailable = (partida.slotsTotal || 0) - (partida.slotsReserved || 0);
  const isFull = slotsAvailable <= 0;
  const discount = Number(partida.discountPercent) || 0;
  const discountedPrice = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;

  return (
    <div
      className="partida-card"
      onClick={() => !isFull && navigate(`/alquileres/partida/${partida.id}`)}
      style={{ cursor: isFull ? "default" : "pointer" }}
    >
      {partida.mapImageUrl && (
        <div className="partida-card__map">
          <img src={partida.mapImageUrl} alt={`Mapa ${partida.lugar}`} />
        </div>
      )}

      <div className="partida-card__body">
        <div className="partida-card__date">{dateStr}</div>
        <h3 className="partida-card__lugar">{partida.lugar}</h3>
        {partida.direccion && (
          <p className="partida-card__dir">{partida.direccion}</p>
        )}

        <div className="partida-card__meta">
          <span className="partida-card__tag">{timeStr} hs</span>
          <span className="partida-card__tag">{partida.modalidad}</span>
        </div>

        <div className="partida-card__footer">
          <div className="partida-card__price">
            {discount > 0 && (
              <span className="partida-card__price-original">
                ${Number(basePrice).toLocaleString("es-AR")}
              </span>
            )}
            ${Number(discountedPrice).toLocaleString("es-AR")}
            {discount > 0 && (
              <span className="partida-card__discount-badge">-{discount}%</span>
            )}
          </div>
        </div>

        <div style={{ paddingTop: 8, display: "flex", justifyContent: "flex-end" }}>
          {isFull ? (
            <span className="partida-card__full">COMPLETO</span>
          ) : (
            <span className="partida-card__slots">
              {slotsAvailable} {slotsAvailable === 1 ? "cupo" : "cupos"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
