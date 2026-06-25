import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { gsap } from "gsap";
import "./ServicioPage.css";

export const SERVICIO_COMING_SOON = false;
const COMING_SOON = SERVICIO_COMING_SOON;

export default function ServicioPage() {
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const pageRef = useRef(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    getDoc(doc(db, "servicioConfig", "default")).then((snap) => {
      if (snap.exists()) setConfig(snap.data());
    });
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.from(".sv-title", { opacity: 0, y: 60, duration: 0.9 })
        .from(".sv-subtitle", { opacity: 0, y: 30, duration: 0.7 }, "-=0.5")
        .from(".sv-card", {
          opacity: 0,
          y: 50,
          scale: 0.94,
          duration: 0.75,
          stagger: 0.15,
          clearProps: "all",
        }, "-=0.3")
        .from(".sv-info-item", {
          opacity: 0,
          y: 24,
          duration: 0.5,
          stagger: 0.08,
          clearProps: "all",
        }, "-=0.3");
    }, pageRef);

    return () => ctx.revert();
  }, []);


  const diagnosticFee = config?.diagnosticFee || 17000;
  const primaComun = config?.maintenance?.primaria_comun || 25000;
  const secComun = config?.maintenance?.secundaria_comun || 18000;

  return (
    <div className="sv-page" ref={pageRef}>
      <div className="sv-hero">
        <h1 className="sv-title">Servicio Técnico</h1>
        <p className="sv-subtitle">
          Diagnóstico, reparación y mantenimiento profesional de réplicas AEG y GBB.
          Llevá tu réplica al siguiente nivel.
        </p>
      </div>

      {COMING_SOON && (
        <div style={{
          background: "rgba(200,244,0,0.06)",
          border: "1px solid rgba(200,244,0,0.3)",
          borderRadius: 14,
          padding: "28px 32px",
          marginBottom: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          textAlign: "center",
        }}>
          <div style={{
            background: "#c8f400",
            color: "#000",
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            padding: "5px 14px",
            borderRadius: 999,
          }}>
            Próximamente
          </div>
          <p style={{ color: "#c8f400", fontWeight: 700, fontSize: 15, margin: 0, maxWidth: 520 }}>
            El sistema de turnos online estará disponible muy pronto.
          </p>
          <p style={{ color: "#888", fontWeight: 600, fontSize: 13, margin: 0 }}>
            Por ahora podés contactarnos para coordinar:
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <a
              href="https://wa.me/541130441967"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#c8f400", color: "#000",
                fontWeight: 900, fontSize: 13,
                padding: "10px 20px", borderRadius: 999,
                textDecoration: "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.524 5.845L.057 23.884l6.194-1.624A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.37l-.36-.214-3.676.964.982-3.585-.234-.369A9.818 9.818 0 1 1 12 21.818z"/></svg>
              WhatsApp
            </a>
            <a
              href="https://instagram.com/genesis_airsoft"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "transparent",
                border: "1px solid rgba(200,244,0,0.4)",
                color: "#c8f400",
                fontWeight: 800, fontSize: 13,
                padding: "10px 20px", borderRadius: 999,
                textDecoration: "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              Instagram
            </a>
          </div>
        </div>
      )}

      <div className="sv-grid" ref={gridRef} style={COMING_SOON ? { opacity: 0.5, pointerEvents: "none", userSelect: "none" } : {}}>
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
