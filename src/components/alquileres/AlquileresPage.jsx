import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import PartidaCard from "./PartidaCard";
import { gsap } from "gsap";
import "./AlquileresPage.css";

export default function AlquileresPage() {
  const [partidas, setPartidas] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date();

        // Fetch all, filter + sort client-side (avoids composite index)
        const snap = await getDocs(collection(db, "partidas"));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => {
            const h = p.horario?.toDate ? p.horario.toDate() : new Date(p.horario);
            return p.status === "active" && h > now;
          })
          .sort((a, b) => {
            const ha = a.horario?.toDate ? a.horario.toDate() : new Date(a.horario);
            const hb = b.horario?.toDate ? b.horario.toDate() : new Date(b.horario);
            return ha - hb;
          });

        setPartidas(list);

        // Load rental config for prices
        const cfgSnap = await getDoc(doc(db, "rentalConfig", "default"));
        if (cfgSnap.exists()) setConfig(cfgSnap.data());
      } catch (err) {
        console.error("Error cargando partidas:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // GSAP entrance
  useEffect(() => {
    if (!loading && gridRef.current) {
      gsap.from(gridRef.current.children, {
        opacity: 0,
        duration: 0.5,
        stagger: 0.12,
        ease: "power2.out",
      });
    }
  }, [loading, partidas]);

  return (
    <div className="alq-page">
      <div className="alq-hero">
        <h1 className="alq-title">Alquileres</h1>
        <p className="alq-subtitle">
          Reservá tu equipamiento para la próxima partida. Incluye marcadora, batería, cargador y lentes.
        </p>
        {config && (
          <div className="alq-price-badge">
            Desde <span>${Number(config.basePrice).toLocaleString("es-AR")}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="alq-loading">Cargando partidas...</div>
      ) : partidas.length === 0 ? (
        <div className="alq-empty">
          <p>No hay partidas programadas por el momento.</p>
          <p>Volvé pronto para ver nuevas fechas.</p>
        </div>
      ) : (
        <div className="alq-grid" ref={gridRef}>
          {partidas.map((p) => (
            <PartidaCard key={p.id} partida={p} basePrice={config?.basePrice || 24000} />
          ))}
        </div>
      )}
    </div>
  );
}
