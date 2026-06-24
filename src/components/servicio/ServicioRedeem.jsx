import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import AuthContext from "../../context/AuthContext";
import ServicioDatePicker from "./ServicioDatePicker";
import "./ServicioRedeem.css";

const REDEEM_URL = "https://us-central1-genesis-airsoft.cloudfunctions.net/redeemPoints";

export default function ServicioRedeem() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null); // "service" | "bbs"
  const [scheduledDate, setScheduledDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/auth?returnTo=/servicio/canjear"); return; }

    const load = async () => {
      try {
        const [userSnap, slotsSnap] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          getDocs(
            query(
              collection(db, "servicioSlots"),
              where("enabled", "==", true)
            )
          ),
        ]);

        const today = new Date().toISOString().slice(0, 10);
        if (userSnap.exists()) setPoints(userSnap.data().points || 0);
        setAvailableSlots(
          slotsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((s) => s.date >= today)
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, navigate]);

  const handleRedeem = async () => {
    if (!selectedType) { setError("Elegí qué canjear"); return; }
    if (selectedType === "service" && !scheduledDate) { setError("Elegí una fecha para el service"); return; }

    setError("");
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const resp = await fetch(REDEEM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          redeemType: selectedType,
          scheduledDate: selectedType === "service" ? scheduledDate : "",
          user: { name: user.displayName || "", email: user.email || "" },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Error al canjear");

      setSuccess(true);
      if (data.turnoId) {
        setTimeout(() => navigate(`/servicio/turno-status/${data.turnoId}`), 2500);
      }
    } catch (err) {
      setError(err.message || "Error al canjear. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="sr-page"><p style={{ color: "#888", textAlign: "center", padding: 60 }}>Cargando...</p></div>;

  if (success) {
    return (
      <div className="sr-page">
        <div className="sr-success">
          <div className="sr-success-icon">✓</div>
          <h2>Canje realizado</h2>
          <p>{selectedType === "service" ? "Tu turno fue registrado. Redirigiendo..." : "¡Premio canjeado! Pasá a retirarlo en Genesis Airsoft."}</p>
        </div>
      </div>
    );
  }

  const canRedeem = points >= 50;

  return (
    <div className="sr-page">
      <button className="sr-back" onClick={() => navigate("/profile")}>
        ← Volver al perfil
      </button>

      <h1 className="sr-title">Canjear Puntos Genesis</h1>

      {/* Points balance */}
      <div className="sr-balance">
        <div className="sr-balance-number">{points}</div>
        <div className="sr-balance-label">puntos disponibles</div>
        <div className="sr-balance-bar">
          <div className="sr-balance-fill" style={{ width: `${Math.min((points / 50) * 100, 100)}%` }} />
        </div>
        <div className="sr-balance-sub">{canRedeem ? "¡Podés canjear!" : `${50 - points} puntos para tu próximo canje`}</div>
      </div>

      {!canRedeem ? (
        <div className="sr-locked">
          <p>Necesitás <strong>50 puntos</strong> para canjear. Completá más servicios para acumular.</p>
          <button className="sr-cta-btn" onClick={() => navigate("/servicio")}>
            Ver servicios disponibles
          </button>
        </div>
      ) : (
        <>
          <h2 className="sr-section-title">Elegí tu premio</h2>
          <div className="sr-options">
            {/* Service option */}
            <div
              className={`sr-option ${selectedType === "service" ? "sr-option--active" : ""}`}
              onClick={() => setSelectedType("service")}
            >
              <div className="sr-option-icon">🔧</div>
              <div className="sr-option-info">
                <div className="sr-option-name">Service Primaria Común gratis</div>
                <div className="sr-option-desc">Un service completo del gearbox + hop-up + canon. Valor: $25.000</div>
              </div>
              <div className="sr-option-cost">50 pts</div>
            </div>

            {/* BBs option */}
            <div
              className={`sr-option ${selectedType === "bbs" ? "sr-option--active" : ""}`}
              onClick={() => setSelectedType("bbs")}
            >
              <div className="sr-option-icon">🎯</div>
              <div className="sr-option-info">
                <div className="sr-option-name">Arcturus RS® SPORT BBs 0.28g</div>
                <div className="sr-option-desc">Un pack Match Grade. Retiralo en Genesis Airsoft.</div>
              </div>
              <div className="sr-option-cost">50 pts</div>
            </div>
          </div>

          {/* Date picker for service */}
          {selectedType === "service" && (
            <div className="sr-date-section">
              <h3 className="sr-section-title">Elegí una fecha</h3>
              {availableSlots.length === 0 ? (
                <p style={{ color: "#888", fontWeight: 600 }}>No hay fechas disponibles. Contactanos.</p>
              ) : (
                <ServicioDatePicker
                  availableSlots={availableSlots}
                  selectedDate={scheduledDate}
                  onSelect={setScheduledDate}
                />
              )}
              {scheduledDate && (
                <div className="sr-date-selected">Fecha: <strong>{scheduledDate}</strong></div>
              )}
            </div>
          )}

          {error && <div className="sr-error">{error}</div>}

          <button
            className="sr-redeem-btn"
            onClick={handleRedeem}
            disabled={submitting || !selectedType}
          >
            {submitting ? "Procesando..." : "Confirmar canje (−50 puntos)"}
          </button>
        </>
      )}
    </div>
  );
}
