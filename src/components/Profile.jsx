import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import AuthContext from "../context/AuthContext";
import {
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import "./Profile.css";

const Profile = () => {
  const { user, logoutUser, loading, auth } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Rental reservations
  const [rentals, setRentals] = useState([]);
  const [loadingRentals, setLoadingRentals] = useState(true);

  // Service turnos
  const [turnos, setTurnos] = useState([]);
  const [loadingTurnos, setLoadingTurnos] = useState(true);

  // Points
  const [points, setPoints] = useState(0);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [configOpen, setConfigOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  const handleSaveChanges = async () => {
    try {
      setMessage("");

      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      if (newPassword) {
        if (!currentPassword) {
          setMessage("error:Debes ingresar tu contraseña actual.");
          return;
        }

        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        await fetch(
          "https://us-central1-genesis-airsoft.cloudfunctions.net/passwordChanged",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: displayName || user.displayName || "usuario",
            }),
          }
        );
      }

      setMessage("success:Datos actualizados correctamente.");
      setNewPassword("");
      setCurrentPassword("");
    } catch (error) {
      console.error("❌ Error updating profile:", error);

      if (error.code === "auth/wrong-password") {
        setMessage("error:La contraseña actual es incorrecta.");
      } else if (error.code === "auth/requires-recent-login") {
        setMessage("error:Debés volver a iniciar sesión para realizar este cambio.");
      } else {
        setMessage("error:No se pudieron actualizar los datos.");
      }
    }
  };

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user]);

  const loadInitialOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);

    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    const docs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const items = Array.isArray(data.items) ? data.items : [];
      const subtotal = items.reduce(
        (acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0),
        0
      );
      const shippingCost = Number(data.shipping?.cost || 0);
      return { id: docSnap.id, ...data, total: subtotal + shippingCost };
    });

    setOrders(docs);
    setLoadingOrders(false);
  };

  useEffect(() => {
    if (!loading && user) loadInitialOrders();
  }, [user, loading]);

  // Load service turnos
  useEffect(() => {
    const loadTurnos = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "servicioTurnos"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setTurnos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error cargando turnos:", err);
      } finally {
        setLoadingTurnos(false);
      }
    };
    if (!loading && user) loadTurnos();
  }, [user, loading]);

  // Load points
  useEffect(() => {
    const loadPoints = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setPoints(snap.data().points || 0);
          setPointsHistory(snap.data().pointsHistory || []);
        }
      } catch (err) {
        console.error("Error cargando puntos:", err);
      } finally {
        setLoadingPoints(false);
      }
    };
    if (!loading && user) loadPoints();
  }, [user, loading]);

  // Load rental reservations
  useEffect(() => {
    const loadRentals = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "rentalReservations"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setRentals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error cargando alquileres:", err);
      } finally {
        setLoadingRentals(false);
      }
    };
    if (!loading && user) loadRentals();
  }, [user, loading]);

  const isGoogleUser =
    user?.providerData?.some((p) => p.providerId === "google.com") || false;

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusLabel = (status) => {
    const map = {
      approved: "Aprobado",
      pending: "Pendiente",
      rejected: "Rechazado",
      in_process: "En proceso",
    };
    return map[status] || status;
  };

  const [msgType, msgText] = message.includes(":")
    ? message.split(/:(.+)/)
    : ["", message];

  return (
    <div className="profile-container">
      {user ? (
        <>
          {/* HEADER */}
          <div className="profile-header">
            <div className="profile-avatar">
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" />
              ) : (
                <span>{getInitials(user.displayName)}</span>
              )}
            </div>
            <div className="profile-header-info">
              <h2>{user.displayName || "Usuario"}</h2>
              <p>{user.email}</p>
              {isGoogleUser && (
                <span className="google-badge">
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    width={14}
                    height={14}
                  />
                  Cuenta Google
                </span>
              )}
            </div>
            <button onClick={() => setConfigOpen(true)} className="profile-settings-btn" title="Configuración">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>

          <div className="profile-grid">
            {/* PANEL IZQUIERDO — PEDIDOS */}
            <div className="profile-panel">
              <div className="panel-header">
                <h3>Mis Pedidos</h3>
                <span className="orders-count">
                  {loadingOrders ? "—" : orders.length}
                </span>
              </div>

              {loadingOrders ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Cargando pedidos...</p>
                </div>
              ) : orders.length > 0 ? (
                <>
                  <ul className="orders-list">
                    {orders.map((order) => (
                      <li
                        key={order.id}
                        className="order-card"
                        onClick={() => navigate(`/order/${order.id}`)}
                      >
                        <div className="order-card-top">
                          <span className="order-id">#{order.id.slice(0, 10)}…</span>
                          <span className={`status-badge status-${order.status}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="order-card-mid">
                          <div className="order-meta">
                            <span className="meta-label">Fecha</span>
                            <span className="meta-value">
                              {order.createdAt?.toDate
                                ? order.createdAt.toDate().toLocaleDateString("es-AR")
                                : "—"}
                            </span>
                          </div>
                          <div className="order-meta">
                            <span className="meta-label">Total</span>
                            <span className="meta-value order-total">
                              ${order.total?.toLocaleString("es-AR")}
                            </span>
                          </div>
                          <div className="order-meta">
                            <span className="meta-label">Despachado</span>
                            <span className={`dispatch-badge ${order.dispatched ? "done" : "not-done"}`}>
                              {order.dispatched ? "Sí" : "No"}
                            </span>
                          </div>
                        </div>

                        <div className="order-card-arrow">›</div>
                      </li>
                    ))}
                  </ul>

                </>
              ) : (
                <div className="empty-state">
                  <p>Todavía no tenés pedidos.</p>
                </div>
              )}
            </div>

            {/* PANEL — MIS ALQUILERES */}
            <div className="profile-panel">
              <div className="panel-header">
                <h3>Mis Alquileres</h3>
                <span className="orders-count">
                  {loadingRentals ? "—" : rentals.length}
                </span>
              </div>

              {loadingRentals ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Cargando alquileres...</p>
                </div>
              ) : rentals.length > 0 ? (
                <ul className="orders-list">
                  {rentals.map((r) => {
                    const rentalStatusMap = {
                      pending_payment: "Pendiente pago",
                      confirmed: "Confirmada",
                      expired: "Expirada",
                      cancelled: "Cancelada",
                    };
                    const rentalStatusClass = {
                      pending_payment: "status-pending",
                      confirmed: "status-approved",
                      expired: "status-rejected",
                      cancelled: "status-rejected",
                    };
                    return (
                      <li
                        key={r.id}
                        className="order-card"
                        onClick={() => navigate(`/alquileres/reserva/${r.id}`)}
                      >
                        <div className="order-card-top">
                          <span className="order-id">#{r.id.slice(0, 10)}…</span>
                          <span className={`status-badge ${rentalStatusClass[r.status] || ""}`}>
                            {rentalStatusMap[r.status] || r.status}
                          </span>
                        </div>
                        <div className="order-card-mid">
                          <div className="order-meta">
                            <span className="meta-label">Fecha</span>
                            <span className="meta-value">
                              {r.createdAt?.toDate
                                ? r.createdAt.toDate().toLocaleDateString("es-AR")
                                : "—"}
                            </span>
                          </div>
                          <div className="order-meta">
                            <span className="meta-label">Seña</span>
                            <span className="meta-value order-total">
                              ${(r.pricing?.deposit || 0).toLocaleString("es-AR")}
                            </span>
                          </div>
                        </div>
                        <div className="order-card-arrow">›</div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="empty-state">
                  <p>No tenés alquileres registrados.</p>
                </div>
              )}
            </div>

            {/* PANEL — MIS TURNOS DE SERVICIO */}
            <div className="profile-panel">
              <div className="panel-header">
                <h3>Mis Turnos de Servicio</h3>
                <span className="orders-count">
                  {loadingTurnos ? "—" : turnos.length}
                </span>
              </div>

              {loadingTurnos ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Cargando turnos...</p>
                </div>
              ) : turnos.length > 0 ? (
                <ul className="orders-list">
                  {turnos.map((t) => {
                    const turnoStatusMap = {
                      pending_approval: "Pendiente",
                      approved: "Aprobado",
                      in_progress: "En proceso",
                      completed: "Completado",
                      cancelled: "Cancelado",
                      rejected: "Rechazado",
                    };
                    const turnoStatusClass = {
                      pending_approval: "status-pending",
                      approved: "status-approved",
                      in_progress: "status-pending",
                      completed: "status-approved",
                      cancelled: "status-rejected",
                      rejected: "status-rejected",
                    };
                    const serviceLabel = t.serviceType === "tecnico"
                      ? "Servicio Técnico"
                      : `Mant. ${t.maintenanceSubtype || ""} ${t.maintenanceVariant || ""}`.trim();
                    return (
                      <li
                        key={t.id}
                        className="order-card"
                        onClick={() => navigate(`/servicio/turno-status/${t.id}`)}
                      >
                        <div className="order-card-top">
                          <span className="order-id">{serviceLabel}</span>
                          <span className={`status-badge ${turnoStatusClass[t.status] || ""}`}>
                            {turnoStatusMap[t.status] || t.status}
                          </span>
                        </div>
                        <div className="order-card-mid">
                          <div className="order-meta">
                            <span className="meta-label">Fecha turno</span>
                            <span className="meta-value">{t.scheduledDate || "—"}</span>
                          </div>
                          <div className="order-meta">
                            <span className="meta-label">Total</span>
                            <span className="meta-value order-total">
                              {t.isRedeemed ? "Canjeado" : `$${Number(t.pricing?.total || 0).toLocaleString("es-AR")}`}
                            </span>
                          </div>
                        </div>
                        <div className="order-card-arrow">›</div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="empty-state">
                  <p>No tenés turnos de servicio.</p>
                </div>
              )}
            </div>

            {/* PANEL — MIS PUNTOS GENESIS */}
            <div className="profile-panel points-panel">
              <div className="panel-header">
                <h3>Mis Puntos Genesis</h3>
                {!loadingPoints && (
                  <span className="orders-count">{points} pts</span>
                )}
              </div>

              {loadingPoints ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Cargando puntos...</p>
                </div>
              ) : (
                <>
                  <div className="points-balance">
                    <span className="points-number">{points}</span>
                    <span className="points-label">puntos acumulados</span>
                    <div className="points-bar-wrap">
                      <div
                        className="points-bar-fill"
                        style={{ width: `${Math.min((points / 50) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="points-sub">
                      {points >= 50
                        ? "¡Podés canjear un servicio gratis!"
                        : `${50 - points} pts para canjear un servicio gratis`}
                    </p>
                  </div>

                  <button
                    className="points-redeem-btn"
                    onClick={() => navigate("/servicio/canjear")}
                    disabled={points < 50}
                  >
                    {points >= 50 ? "Canjear ahora" : "Cómo canjear puntos"}
                  </button>

                  {pointsHistory.length > 0 && (
                    <ul className="points-history">
                      {pointsHistory.slice(0, 5).map((h, i) => (
                        <li key={i} className="points-history-item">
                          <span className={`points-delta ${h.delta > 0 ? "positive" : "negative"}`}>
                            {h.delta > 0 ? `+${h.delta}` : h.delta}
                          </span>
                          <span className="points-reason">{h.reason}</span>
                          <span className="points-date">
                            {h.date?.toDate
                              ? h.date.toDate().toLocaleDateString("es-AR")
                              : typeof h.date === "string" ? h.date : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

          </div>
          {/* CONFIG MODAL */}
          {configOpen && (
            <div className="config-modal-overlay" onClick={() => setConfigOpen(false)}>
              <div className="config-modal" onClick={(e) => e.stopPropagation()}>
                <div className="config-modal-header">
                  <h3>Configuración</h3>
                  <button className="config-modal-close" onClick={() => setConfigOpen(false)}>✕</button>
                </div>

                <div className="settings-form">
                  <div className="field-group">
                    <label>Nombre de usuario</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div className="field-group">
                    <label>Correo electrónico</label>
                    <input type="email" value={user.email} disabled />
                  </div>

                  {!isGoogleUser ? (
                    <>
                      <div className="section-divider"><span>Cambiar contraseña</span></div>
                      <div className="field-group">
                        <label>Contraseña actual</label>
                        <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                      </div>
                      <div className="field-group">
                        <label>Nueva contraseña</label>
                        <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <div className="google-notice">
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={16} height={16} />
                      <span>La contraseña la gestiona Google</span>
                    </div>
                  )}

                  {msgText && (
                    <p className={`update-message ${msgType}`}>{msgText}</p>
                  )}

                  <div className="settings-actions">
                    <button className="btn-save" onClick={handleSaveChanges}>Guardar cambios</button>
                    <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="not-logged">No estás logueado.</p>
      )}
    </div>
  );
};

export default Profile;
