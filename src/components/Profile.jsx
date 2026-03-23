import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
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
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [moreAvailable, setMoreAvailable] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

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
      orderBy("createdAt", "desc"),
      limit(3)
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
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setMoreAvailable(snapshot.docs.length === 3);
    setLoadingOrders(false);
  };

  const loadMoreOrders = async () => {
    if (!lastDoc) return;

    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(3)
    );

    const snapshot = await getDocs(q);

    const newDocs = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const items = Array.isArray(data.items) ? data.items : [];
      const subtotal = items.reduce(
        (acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0),
        0
      );
      const shippingCost = Number(data.shipping?.cost || 0);
      return { id: docSnap.id, ...data, total: subtotal + shippingCost };
    });

    setOrders((prev) => [...prev, ...newDocs]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setMoreAvailable(snapshot.docs.length === 3);
  };

  useEffect(() => {
    if (!loading && user) loadInitialOrders();
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

                  {moreAvailable && (
                    <button onClick={loadMoreOrders} className="btn-load-more">
                      Cargar más pedidos
                    </button>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>Todavía no tenés pedidos.</p>
                </div>
              )}
            </div>

            {/* PANEL DERECHO — CONFIGURACIÓN */}
            <div className="profile-panel">
              <div className="panel-header">
                <h3>Configuración</h3>
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
                    <div className="section-divider">
                      <span>Cambiar contraseña</span>
                    </div>

                    <div className="field-group">
                      <label>Contraseña actual</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="field-group">
                      <label>Nueva contraseña</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="google-notice">
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google"
                      width={16}
                      height={16}
                    />
                    <span>La contraseña la gestiona Google</span>
                  </div>
                )}

                {msgText && (
                  <p className={`update-message ${msgType}`}>{msgText}</p>
                )}

                <div className="settings-actions">
                  <button className="btn-save" onClick={handleSaveChanges}>
                    Guardar cambios
                  </button>
                  <button className="btn-logout" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="not-logged">No estás logueado.</p>
      )}
    </div>
  );
};

export default Profile;
