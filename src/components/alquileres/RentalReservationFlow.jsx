import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import AuthContext from "../../context/AuthContext";
import ExtrasSelector from "./ExtrasSelector";
import ReservationSummary from "./ReservationSummary";
import "./RentalReservationFlow.css";

const FUNCTION_URL = "https://us-central1-genesis-airsoft.cloudfunctions.net/createRentalReservation";

export default function RentalReservationFlow() {
  const { partidaId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [partida, setPartida] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // User data
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    dni: "",
  });

  // Extras
  const [selectedExtras, setSelectedExtras] = useState([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate(`/auth?returnTo=/alquileres/reservar/${partidaId}`);
    }
  }, [user, navigate, partidaId]);

  // Load partida and config
  useEffect(() => {
    const load = async () => {
      try {
        const [pSnap, cSnap] = await Promise.all([
          getDoc(doc(db, "partidas", partidaId)),
          getDoc(doc(db, "rentalConfig", "default")),
        ]);

        if (!pSnap.exists()) {
          setError("Partida no encontrada");
          setLoading(false);
          return;
        }

        setPartida({ id: pSnap.id, ...pSnap.data() });
        if (cSnap.exists()) setConfig(cSnap.data());

        // Pre-fill user data
        if (user) {
          setUserData((prev) => ({
            ...prev,
            name: user.displayName || "",
            email: user.email || "",
          }));
        }
      } catch (err) {
        console.error(err);
        setError("Error cargando datos");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [partidaId, user]);

  const handleUserChange = (e) => {
    setUserData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleExtra = (extraId) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  // Calculate pricing
  const basePrice = config?.basePrice || 24000;
  const depositPercent = config?.depositPercent || 50;
  const expirationMinutes = config?.expirationMinutes || 30;
  const allExtras = config?.extras || [];
  const chosenExtras = allExtras.filter((e) => selectedExtras.includes(e.id));
  const extrasTotal = chosenExtras.reduce((sum, e) => sum + Number(e.price), 0);
  const totalFull = basePrice + extrasTotal;
  const deposit = Math.round(basePrice * (depositPercent / 100));
  const remainingOnDay = totalFull - deposit;

  const pricing = { basePrice, extrasTotal, totalFull, deposit, remainingOnDay };
  const transferInfo = {
    alias: config?.transferAlias || "",
    cvu: config?.transferCVU || "",
    holder: config?.transferHolder || "",
  };

  // Validation
  const validateStep1 = () => {
    if (!userData.name.trim()) return "El nombre es obligatorio";
    if (!userData.email.trim()) return "El email es obligatorio";
    if (!userData.phone.trim()) return "El teléfono es obligatorio";
    if (!userData.dni.trim()) return "El DNI es obligatorio";
    if (!/^\d{7,8}$/.test(userData.dni.replace(/\./g, ""))) return "El DNI debe tener 7 u 8 dígitos";
    return null;
  };

  const goNext = () => {
    setError("");
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          partidaId,
          extras: selectedExtras,
          user: userData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear la reserva");
        setSubmitting(false);
        return;
      }

      navigate(`/alquileres/reserva/${data.reservationId}`);
    } catch (err) {
      console.error(err);
      setError("Error de conexión. Intentá de nuevo.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="rf-page"><p className="rf-loading">Cargando...</p></div>;
  if (!partida) return <div className="rf-page"><p className="rf-loading">Partida no encontrada</p></div>;

  const horario = partida.horario?.toDate ? partida.horario.toDate() : new Date(partida.horario);

  return (
    <div className="rf-page">
      <button className="rf-back-link" onClick={() => navigate(`/alquileres/partida/${partidaId}`)}>
        ← Volver
      </button>

      <h1 className="rf-title">Reservar Alquiler</h1>
      <p className="rf-partida-info">
        {partida.lugar} — {horario.toLocaleDateString("es-AR", { dateStyle: "long" })} — {partida.modalidad}
      </p>

      {/* Steps indicator */}
      <div className="rf-steps">
        {["Datos", "Extras", "Confirmar"].map((label, i) => (
          <div key={i} className={`rf-step ${step >= i + 1 ? "rf-step--active" : ""}`}>
            <div className="rf-step-num">{i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && <div className="rf-error">{error}</div>}

      {/* Step 1: User Data */}
      {step === 1 && (
        <div className="rf-step-content">
          <h3 className="rf-section-title">Tus datos</h3>
          <div className="rf-form">
            <div className="rf-field">
              <label>Nombre completo *</label>
              <input name="name" value={userData.name} onChange={handleUserChange} />
            </div>
            <div className="rf-field">
              <label>Email *</label>
              <input name="email" value={userData.email} onChange={handleUserChange} disabled />
            </div>
            <div className="rf-row">
              <div className="rf-field">
                <label>Teléfono *</label>
                <input name="phone" value={userData.phone} onChange={handleUserChange} placeholder="1155551234" />
              </div>
              <div className="rf-field">
                <label>DNI *</label>
                <input name="dni" value={userData.dni} onChange={handleUserChange} placeholder="12345678" />
              </div>
            </div>
          </div>
          <div className="rf-actions">
            <button className="rf-btn rf-btn--primary" onClick={goNext}>Siguiente</button>
          </div>
        </div>
      )}

      {/* Step 2: Extras */}
      {step === 2 && (
        <div className="rf-step-content">
          <ExtrasSelector extras={allExtras} selected={selectedExtras} onToggle={toggleExtra} />
          <div className="rf-actions">
            <button className="rf-btn rf-btn--ghost" onClick={goBack}>Atrás</button>
            <button className="rf-btn rf-btn--primary" onClick={goNext}>Siguiente</button>
          </div>
        </div>
      )}

      {/* Step 3: Summary + Confirm */}
      {step === 3 && (
        <div className="rf-step-content">
          <ReservationSummary
            pricing={pricing}
            extras={chosenExtras}
            transferInfo={transferInfo}
            expirationMinutes={expirationMinutes}
          />
          <div className="rf-actions">
            <button className="rf-btn rf-btn--ghost" onClick={goBack}>Atrás</button>
            <button
              className="rf-btn rf-btn--primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Procesando..." : `Confirmar Reserva — Seña $${deposit.toLocaleString("es-AR")}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
