import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import AuthContext from "../../context/AuthContext";
import "./PartidaDetail.css";

export default function PartidaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [partida, setPartida] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [pSnap, cSnap] = await Promise.all([
          getDoc(doc(db, "partidas", id)),
          getDoc(doc(db, "rentalConfig", "default")),
        ]);

        if (pSnap.exists()) setPartida({ id: pSnap.id, ...pSnap.data() });
        if (cSnap.exists()) setConfig(cSnap.data());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="pd-page"><p className="pd-loading">Cargando...</p></div>;
  if (!partida) return <div className="pd-page"><p className="pd-loading">Partida no encontrada</p></div>;

  const horario = partida.horario?.toDate ? partida.horario.toDate() : new Date(partida.horario);
  const dateStr = horario.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = horario.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const slotsAvailable = (partida.slotsTotal || 0) - (partida.slotsReserved || 0);
  const isFull = slotsAvailable <= 0;
  const basePrice = config?.basePrice || 24000;
  const discount = Number(partida.discountPercent) || 0;
  const discountedBase = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;
  const deposit = Math.round(discountedBase * ((config?.depositPercent || 50) / 100));

  const handleReservar = () => {
    if (!user) {
      navigate(`/auth?returnTo=/alquileres/reservar/${id}`);
      return;
    }
    navigate(`/alquileres/reservar/${id}`);
  };

  return (
    <div className="pd-page">
      <button className="pd-back" onClick={() => navigate("/alquileres")}>
        ← Volver a partidas
      </button>

      <div className="pd-layout">
        {/* Map */}
        <div className="pd-map-section">
          {partida.mapImageUrl ? (
            <img src={partida.mapImageUrl} alt="Mapa" className="pd-map-img" />
          ) : (
            <div className="pd-map-placeholder">Sin mapa disponible</div>
          )}
        </div>

        {/* Info */}
        <div className="pd-info">
          <span className="pd-date">{dateStr}</span>
          <h1 className="pd-lugar">{partida.lugar}</h1>
          {partida.direccion && <p className="pd-dir">{partida.direccion}</p>}
          {partida.mapsUrl && (
            <a href={partida.mapsUrl} target="_blank" rel="noopener noreferrer" className="pd-maps-link">
              Ver en Google Maps →
            </a>
          )}

          <div className="pd-tags">
            <span className="pd-tag">{timeStr} hs</span>
            <span className="pd-tag">{partida.modalidad}</span>
            <span className={`pd-tag ${isFull ? "pd-tag--full" : "pd-tag--slots"}`}>
              {isFull ? "COMPLETO" : `${slotsAvailable} cupos disponibles`}
            </span>
          </div>

          <div className="pd-equipment">
            <h3>Equipamiento incluido</h3>
            <ul>
              <li>1 marcadora funcional</li>
              <li>1 batería cargada</li>
              <li>1 cargador (magazine con 300bbs)</li>
              <li>1 par de lentes protectores</li>
            </ul>
          </div>

          <div className="pd-pricing">
            <div className="pd-price-row">
              <span>Alquiler</span>
              <span className="pd-price" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {discount > 0 && (
                  <span style={{ color: "#555", fontSize: 14, fontWeight: 700, textDecoration: "line-through" }}>
                    ${basePrice.toLocaleString("es-AR")}
                  </span>
                )}
                ${discountedBase.toLocaleString("es-AR")}
                {discount > 0 && (
                  <span style={{ background: "var(--accent, #c8f400)", color: "#000", fontSize: 11, fontWeight: 900, padding: "2px 7px", borderRadius: 999 }}>
                    -{discount}%
                  </span>
                )}
              </span>
            </div>
            <div className="pd-price-row pd-price-row--highlight">
              <span>Seña para reservar ({config?.depositPercent || 50}%)</span>
              <span className="pd-price">${deposit.toLocaleString("es-AR")}</span>
            </div>
          </div>

          <div className="pd-rules">
            <h3>Normas del alquiler</h3>
            <ul>
              <li>Uso obligatorio de lentes protectores</li>
              <li>Solo se permiten BBs marca BLS</li>
              <li>Devolver equipamiento en buen estado</li>
              <li>El locatario se responsabiliza por daños, pérdidas o robos</li>
            </ul>
          </div>

          {!isFull && (
            <button className="pd-cta" onClick={handleReservar}>
              Reservar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
