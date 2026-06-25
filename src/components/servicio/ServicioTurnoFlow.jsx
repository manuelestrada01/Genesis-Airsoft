import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import AuthContext from "../../context/AuthContext";
import ServicioDatePicker from "./ServicioDatePicker";
import "./ServicioTurnoFlow.css";

const FUNCTION_URL = "https://us-central1-genesis-airsoft.cloudfunctions.net/createServicioTurno";
const TIPOS_REPLICA = ["AEG", "GBB", "HPA", "Bolt Action", "Spring"];
const TIPOS_CON_GEARBOX = ["AEG", "HPA"];
const STEPS = ["Datos", "Réplica", "Servicio", "Fecha", "Confirmar"];

export default function ServicioTurnoFlow() {
  const { type } = useParams(); // "tecnico" | "mantenimiento"
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [config, setConfig] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // User data
  const [userData, setUserData] = useState({ name: "", email: "", phone: "", instagram: "" });

  // Replica data
  const [replica, setReplica] = useState({ marca: "", modelo: "", serie: "", tipo: "AEG", gearbox: "", fpsEstimado: "" });

  // Service specific
  const [fallaReportada, setFallaReportada] = useState("");
  const [maintenanceSubtype, setMaintenanceSubtype] = useState("primaria");
  const [maintenanceVariant, setMaintenanceVariant] = useState("comun");
  const [selectedAddons, setSelectedAddons] = useState([]);

  // Date
  const [scheduledDate, setScheduledDate] = useState("");

  // Location
  const [selectedLocation, setSelectedLocation] = useState(null); // { name, address, mapsUrl }

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate(`/auth?returnTo=/servicio/turno/${type}`);
  }, [user, navigate, type]);

  // Load config and available slots
  useEffect(() => {
    const load = async () => {
      try {
        const [cfgSnap, slotsSnap] = await Promise.all([
          getDoc(doc(db, "servicioConfig", "default")),
          getDocs(
            query(
              collection(db, "servicioSlots"),
              where("enabled", "==", true)
            )
          ),
        ]);

        if (cfgSnap.exists()) setConfig(cfgSnap.data());

        const today = new Date().toISOString().slice(0, 10);
        const slots = slotsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.date >= today);
        setAvailableSlots(slots);

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
  }, [user, type]);

  const handleUserChange = (e) => setUserData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleReplicaChange = (e) => setReplica((p) => ({ ...p, [e.target.name]: e.target.value }));

  const toggleAddon = (id) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Pricing calculation (client-side preview — server recalculates)
  const DEFAULTS = {
    diagnosticFee: 17000,
    maintenance: {
      primaria_comun: 25000,
      primaria_plus: 28000,
      secundaria_comun: 18000,
      secundaria_plus: 20000,
    },
  };
  const maintenance = config?.maintenance || DEFAULTS.maintenance;
  const addons = config?.addons || [];
  const chosenAddons = addons.filter((a) => selectedAddons.includes(a.id));
  const addonsTotal = chosenAddons.reduce((s, a) => s + Number(a.price || 0), 0);

  let serviceFee = 0;
  if (type === "tecnico") {
    serviceFee = Number(config?.diagnosticFee || DEFAULTS.diagnosticFee);
  } else {
    const key = `${maintenanceSubtype}_${maintenanceVariant}`;
    serviceFee = Number(maintenance[key] || DEFAULTS.maintenance[key] || 0);
  }
  const total = serviceFee + addonsTotal;

  // Validation
  const validateStep = () => {
    if (step === 1) {
      if (!userData.name.trim()) return "El nombre es obligatorio";
      if (!userData.email.trim()) return "El email es obligatorio";
      if (!userData.phone.trim()) return "El teléfono es obligatorio";
      const locs = config?.locations?.filter(l => l.name || l.address) || [];
      if (locs.length > 0 && !selectedLocation) return "Elegí una ubicación donde realizar el servicio";
    }
    if (step === 2) {
      if (!replica.marca.trim()) return "La marca es obligatoria";
      if (!replica.modelo.trim()) return "El modelo es obligatorio";
    }
    if (step === 3 && type === "tecnico") {
      if (!fallaReportada.trim()) return "Describí la falla de tu réplica";
    }
    if (step === 4) {
      if (!scheduledDate) return "Elegí una fecha para el turno";
    }
    return null;
  };

  const goNext = () => {
    setError("");
    const err = validateStep();
    if (err) { setError(err); return; }
    setStep((s) => s + 1);
  };

  const goBack = () => { setError(""); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const resp = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceType: type,
          scheduledDate,
          user: userData,
          replica,
          fallaReportada: type === "tecnico" ? fallaReportada : "",
          maintenanceSubtype: type === "mantenimiento" ? maintenanceSubtype : "",
          maintenanceVariant: type === "mantenimiento" ? maintenanceVariant : "",
          addons: selectedAddons,
          isRedeemed: false,
          location: selectedLocation || null,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Error al crear el turno"); setSubmitting(false); return; }

      navigate(`/servicio/turno-status/${data.turnoId}`);
    } catch (err) {
      console.error(err);
      setError("Error de conexión. Intentá de nuevo.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="stf-page"><p className="stf-loading">Cargando...</p></div>;

  const typeLabel = type === "tecnico" ? "Servicio Técnico" : "Service de Mantenimiento";

  return (
    <div className="stf-page">
      <button className="stf-back-link" onClick={() => navigate("/servicio")}>
        ← Volver a servicios
      </button>

      <h1 className="stf-title">Reservar Turno</h1>
      <p className="stf-subtitle">{typeLabel}</p>

      {/* Steps indicator */}
      <div className="stf-steps">
        {STEPS.map((label, i) => (
          <div key={i} className={`stf-step ${step >= i + 1 ? "stf-step--active" : ""}`}>
            <div className="stf-step-num">{i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && <div className="stf-error">{error}</div>}

      {/* ── Step 1: User data ── */}
      {step === 1 && (
        <div className="stf-step-content">
          <h3 className="stf-section-title">Tus datos</h3>
          <div className="stf-form">
            <div className="stf-field">
              <label>Nombre completo *</label>
              <input name="name" value={userData.name} onChange={handleUserChange} placeholder="Juan Pérez" />
            </div>
            <div className="stf-field">
              <label>Email *</label>
              <input name="email" value={userData.email} onChange={handleUserChange} disabled />
            </div>
            <div className="stf-row">
              <div className="stf-field">
                <label>Teléfono *</label>
                <input name="phone" value={userData.phone} onChange={handleUserChange} placeholder="1155551234" />
              </div>
              <div className="stf-field">
                <label>Instagram / Alias</label>
                <input name="instagram" value={userData.instagram} onChange={handleUserChange} placeholder="@usuario" />
              </div>
            </div>
          </div>
          {/* Location selector — only if config has locations */}
          {(config?.locations || []).filter(l => l.name || l.address).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 className="stf-section-title">¿Dónde realizás el service?</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {config.locations.filter(l => l.name || l.address).map((loc, i) => {
                  const isSelected = selectedLocation?.name === loc.name && selectedLocation?.address === loc.address;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedLocation(loc)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                        border: isSelected ? "2px solid #c8f400" : "2px solid #2a2a2a",
                        background: isSelected ? "rgba(200,244,0,0.07)" : "#1a1a1a",
                        textAlign: "left", transition: "all 0.15s",
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                        border: isSelected ? "5px solid #c8f400" : "2px solid #444",
                        background: "transparent", transition: "all 0.15s",
                      }} />
                      <div>
                        <div style={{ color: isSelected ? "#c8f400" : "#fff", fontWeight: 800, fontSize: 14 }}>{loc.name}</div>
                        {loc.address && <div style={{ color: "#888", fontWeight: 600, fontSize: 12, marginTop: 2 }}>{loc.address}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="stf-actions">
            <button className="stf-btn stf-btn--primary" onClick={goNext}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Replica data ── */}
      {step === 2 && (
        <div className="stf-step-content">
          <h3 className="stf-section-title">Datos de la réplica</h3>
          <div className="stf-form">
            <div className="stf-row">
              <div className="stf-field">
                <label>Marca *</label>
                <input name="marca" value={replica.marca} onChange={handleReplicaChange} placeholder="ICS, G&G, Arcturus..." />
              </div>
              <div className="stf-field">
                <label>Modelo *</label>
                <input name="modelo" value={replica.modelo} onChange={handleReplicaChange} placeholder="AK74, M4, MP5..." />
              </div>
            </div>
            <div className="stf-row">
              <div className="stf-field">
                <label>Tipo</label>
                <select name="tipo" value={replica.tipo} onChange={handleReplicaChange}>
                  {TIPOS_REPLICA.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {TIPOS_CON_GEARBOX.includes(replica.tipo) && (
                <div className="stf-field">
                  <label>Gearbox</label>
                  <input name="gearbox" value={replica.gearbox} onChange={handleReplicaChange} placeholder="V2, V3, V6..." />
                </div>
              )}
            </div>
            <div className="stf-row">
              <div className="stf-field">
                <label>N° Serie / ID</label>
                <input name="serie" value={replica.serie} onChange={handleReplicaChange} placeholder="Opcional" />
              </div>
              <div className="stf-field">
                <label>FPS estimado</label>
                <input name="fpsEstimado" value={replica.fpsEstimado} onChange={handleReplicaChange} placeholder="280 FPS" />
              </div>
            </div>
          </div>
          <div className="stf-actions">
            <button className="stf-btn stf-btn--ghost" onClick={goBack}>← Atrás</button>
            <button className="stf-btn stf-btn--primary" onClick={goNext}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Service detail ── */}
      {step === 3 && (
        <div className="stf-step-content">
          {type === "tecnico" ? (
            <>
              <h3 className="stf-section-title">Descripción de la falla</h3>
              <p className="stf-section-sub">Describí el problema que tiene tu réplica con el mayor detalle posible.</p>
              <textarea
                className="stf-textarea"
                value={fallaReportada}
                onChange={(e) => setFallaReportada(e.target.value)}
                placeholder="Ej: La réplica no dispara, hace ruido extraño en el gearbox, corte de ciclo irregular..."
                rows={5}
              />
            </>
          ) : (
            <>
              <h3 className="stf-section-title">Tipo de mantenimiento</h3>

              {/* Subtype */}
              <div className="stf-option-group">
                <h4 className="stf-option-label">Tipo de service</h4>
                <div className="stf-options">
                  {[
                    { value: "primaria", label: "Primaria", desc: "Gearbox completo + Inner" },
                    { value: "secundaria", label: "Secundaria", desc: "Internos + Inner" },
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      className={`stf-option ${maintenanceSubtype === opt.value ? "stf-option--active" : ""}`}
                      onClick={() => setMaintenanceSubtype(opt.value)}
                    >
                      <div className="stf-option-radio" />
                      <div>
                        <div className="stf-option-name">{opt.label}</div>
                        <div className="stf-option-desc">{opt.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Variant */}
              <div className="stf-option-group">
                <h4 className="stf-option-label">Variante</h4>
                <div className="stf-options">
                  {[
                    { value: "comun", label: "Común", desc: "Lubricantes estándar", price: maintenance[`${maintenanceSubtype}_comun`] || DEFAULTS.maintenance[`${maintenanceSubtype}_comun`] },
                    { value: "plus", label: "Plus", desc: "Lubricantes 4UANTUM premium", price: maintenance[`${maintenanceSubtype}_plus`] || DEFAULTS.maintenance[`${maintenanceSubtype}_plus`] },
                  ].map((opt) => (
                    <div
                      key={opt.value}
                      className={`stf-option ${maintenanceVariant === opt.value ? "stf-option--active" : ""}`}
                      onClick={() => setMaintenanceVariant(opt.value)}
                    >
                      <div className="stf-option-radio" />
                      <div style={{ flex: 1 }}>
                        <div className="stf-option-name">{opt.label}</div>
                        <div className="stf-option-desc">{opt.desc}</div>
                      </div>
                      {opt.price > 0 && (
                        <div className="stf-option-price">${Number(opt.price).toLocaleString("es-AR")}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              {addons.length > 0 && (
                <div className="stf-option-group">
                  <h4 className="stf-option-label">Mejoras opcionales</h4>
                  <p className="stf-section-sub">Se instalan durante el service.</p>
                  <div className="stf-extras">
                    {addons.map((addon) => {
                      const active = selectedAddons.includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          className={`stf-extra-item ${active ? "stf-extra-item--active" : ""}`}
                          onClick={() => toggleAddon(addon.id)}
                        >
                          <div className={`stf-extra-check ${active ? "stf-extra-check--active" : ""}`}>
                            {active && "✓"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="stf-extra-name">{addon.name}</div>
                          </div>
                          {addon.price > 0 && (
                            <div className="stf-extra-price">+${Number(addon.price).toLocaleString("es-AR")}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Price preview */}
          <div className="stf-price-preview">
            <span>Total estimado:</span>
            <span className="stf-price-total">${total.toLocaleString("es-AR")}</span>
          </div>

          <div className="stf-actions">
            <button className="stf-btn stf-btn--ghost" onClick={goBack}>← Atrás</button>
            <button className="stf-btn stf-btn--primary" onClick={goNext}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* ── Step 4: Date picker ── */}
      {step === 4 && (
        <div className="stf-step-content">
          <h3 className="stf-section-title">Elegí una fecha</h3>
          <p className="stf-section-sub">Solo se muestran los días habilitados por el taller.</p>

          {availableSlots.length === 0 ? (
            <div className="stf-no-dates">
              <p>No hay fechas disponibles en este momento.</p>
              <p>Volvé pronto o contactanos para coordinar.</p>
            </div>
          ) : (
            <ServicioDatePicker
              availableSlots={availableSlots}
              selectedDate={scheduledDate}
              onSelect={setScheduledDate}
            />
          )}

          {scheduledDate && (
            <div className="stf-date-selected">
              Fecha seleccionada: <strong>{scheduledDate}</strong>
            </div>
          )}

          <div className="stf-actions">
            <button className="stf-btn stf-btn--ghost" onClick={goBack}>← Atrás</button>
            <button className="stf-btn stf-btn--primary" onClick={goNext} disabled={!scheduledDate}>
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Summary + Confirm ── */}
      {step === 5 && (
        <div className="stf-step-content">
          <h3 className="stf-section-title">Resumen del turno</h3>

          <div className="stf-summary">
            <div className="stf-summary-section">
              <h4>Datos personales</h4>
              <div className="stf-summary-row"><span>Nombre</span><span>{userData.name}</span></div>
              <div className="stf-summary-row"><span>Email</span><span>{userData.email}</span></div>
              <div className="stf-summary-row"><span>Teléfono</span><span>{userData.phone}</span></div>
              {userData.instagram && <div className="stf-summary-row"><span>Instagram</span><span>{userData.instagram}</span></div>}
            </div>

            <div className="stf-summary-section">
              <h4>Réplica</h4>
              <div className="stf-summary-row"><span>Marca / Modelo</span><span>{replica.marca} {replica.modelo}</span></div>
              <div className="stf-summary-row"><span>Tipo</span><span>{replica.tipo}</span></div>
              {replica.gearbox && <div className="stf-summary-row"><span>Gearbox</span><span>{replica.gearbox}</span></div>}
              {replica.fpsEstimado && <div className="stf-summary-row"><span>FPS</span><span>{replica.fpsEstimado}</span></div>}
            </div>

            <div className="stf-summary-section">
              <h4>Servicio</h4>
              <div className="stf-summary-row"><span>Tipo</span><span>{typeLabel}</span></div>
              {type === "mantenimiento" && (
                <>
                  <div className="stf-summary-row"><span>Subtipo</span><span style={{ textTransform: "capitalize" }}>{maintenanceSubtype} {maintenanceVariant}</span></div>
                  {chosenAddons.length > 0 && (
                    <div className="stf-summary-row"><span>Mejoras</span><span>{chosenAddons.map((a) => a.name).join(", ")}</span></div>
                  )}
                </>
              )}
              {type === "tecnico" && (
                <div className="stf-summary-row stf-summary-row--falla"><span>Falla reportada</span><span>{fallaReportada}</span></div>
              )}
              <div className="stf-summary-row"><span>Fecha</span><span>{scheduledDate}</span></div>
              {selectedLocation && (
                <div className="stf-summary-row"><span>Local</span><span>{selectedLocation.name}{selectedLocation.address ? ` — ${selectedLocation.address}` : ""}</span></div>
              )}
            </div>

            <div className="stf-summary-pricing">
              <div className="stf-summary-row"><span>Servicio</span><span>${serviceFee.toLocaleString("es-AR")}</span></div>
              {addonsTotal > 0 && <div className="stf-summary-row"><span>Mejoras</span><span>+${addonsTotal.toLocaleString("es-AR")}</span></div>}
              <div className="stf-summary-divider" />
              <div className="stf-summary-row stf-summary-row--total">
                <span>Total estimado</span>
                <span>${total.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>

          <div className="stf-warning">
            El total puede variar según el diagnóstico y los repuestos necesarios. Se te enviará un presupuesto detallado.
          </div>

          <div className="stf-actions">
            <button className="stf-btn stf-btn--ghost" onClick={goBack}>← Atrás</button>
            <button
              className="stf-btn stf-btn--primary"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Procesando..." : "Confirmar turno"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
