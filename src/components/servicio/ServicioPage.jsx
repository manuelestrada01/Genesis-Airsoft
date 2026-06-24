import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { gsap } from "gsap";
import "./ServicioPage.css";

export default function ServicioPage() {
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    getDoc(doc(db, "servicioConfig", "default")).then((snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
  }, []);

  useEffect(() => {
    if (gridRef.current) {
      gsap.from(gridRef.current.children, {
        opacity: 0,
        y: 30,
        duration: 0.5,
        stagger: 0.12,
        ease: "power2.out",
        clearProps: "all",
      });
    }
  }, []);

  const diagnosticFee = config?.diagnosticFee || 17000;
  const primaComun = config?.maintenance?.primaria_comun || 25000;
  const secComun = config?.maintenance?.secundaria_comun || 18000;

  return (
    <div className="sv-page">
      <div className="sv-hero">
        <h1 className="sv-title">Servicio Técnico</h1>
        <p className="sv-subtitle">
          Diagnóstico, reparación y mantenimiento profesional de réplicas AEG y GBB.
          Llevá tu réplica al siguiente nivel.
        </p>
      </div>

      <div className="sv-grid" ref={gridRef}>
        {/* Servicio Técnico card */}
        <div className="sv-card">
          <div className="sv-card-badge">Diagnóstico + Reparación</div>
          <h2 className="sv-card-title">Servicio Técnico</h2>
          <p className="sv-card-desc">
            Diagnóstico completo de tu réplica con informe detallado y presupuesto de reparación.
          </p>
          <ul className="sv-card-features">
            <li>Diagnóstico completo del gearbox</li>
            <li>Informe de fallas y reparaciones</li>
            <li>Presupuesto detallado</li>
            <li>Reparación según presupuesto aprobado</li>
          </ul>
          <div className="sv-card-price">
            <span className="sv-price-from">Desde</span>
            <span className="sv-price-amount">${diagnosticFee.toLocaleString("es-AR")}</span>
            <span className="sv-price-label">diagnóstico</span>
          </div>
          <button
            className="sv-card-btn"
            onClick={() => navigate("/servicio/turno/tecnico")}
          >
            Sacar turno
          </button>
        </div>

        {/* Mantenimiento card */}
        <div className="sv-card">
          <div className="sv-card-badge sv-card-badge--green">Mantenimiento Preventivo</div>
          <h2 className="sv-card-title">Service de Mantenimiento</h2>
          <p className="sv-card-desc">
            Limpieza, lubricación y ajuste completo de tu réplica. Disponible en variante Común o
            Plus (lubricantes 4UANTUM premium).
          </p>
          <ul className="sv-card-features">
            <li>Limpieza profunda del gearbox</li>
            <li>Lubricación completa</li>
            <li>Ajuste y calibración</li>
            <li>Variante Plus con lubricantes 4UANTUM</li>
          </ul>
          <div className="sv-pricing-table">
            <div className="sv-pricing-row">
              <span>Secundaria Común</span>
              <span>${secComun.toLocaleString("es-AR")}</span>
            </div>
            <div className="sv-pricing-row">
              <span>Primaria Común</span>
              <span>${primaComun.toLocaleString("es-AR")}</span>
            </div>
          </div>
          <button
            className="sv-card-btn"
            onClick={() => navigate("/servicio/turno/mantenimiento")}
          >
            Sacar turno
          </button>
        </div>
      </div>

      {/* Info section */}
      <div className="sv-info">
        <div className="sv-info-item">
          <span className="sv-info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </span>
          <div>
            <strong>Técnico especializado</strong>
            <p>Manuel Estrada — Genesis Airsoft</p>
          </div>
        </div>
        <div className="sv-info-item">
          <span className="sv-info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          <div>
            <strong>Turnos por fecha</strong>
            <p>Elegí el día que mejor te quede</p>
          </div>
        </div>
        <div className="sv-info-item">
          <span className="sv-info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </span>
          <div>
            <strong>Puntos Genesis</strong>
            <p>Acumulá puntos y canjealos por premios</p>
          </div>
        </div>
        <div className="sv-info-item">
          <span className="sv-info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </span>
          <div>
            <strong>Presupuesto detallado</strong>
            <p>Recibirás un PDF con todo el trabajo realizado</p>
          </div>
        </div>
      </div>
    </div>
  );
}
