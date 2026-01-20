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
  const [currentPassword, setCurrentPassword] = useState(""); // 🔥 NUEVA
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  // ============================================================
  // 🔥 Guardar cambios de usuario (incluye REAUTENTICACIÓN)
  // ============================================================
  const handleSaveChanges = async () => {
    try {
      setMessage("");

      // ----------- ✨ 1) Cambiar nombre de usuario -----------
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      // ----------- ✨ 2) Cambiar contraseña (requiere reauth) -----------
      if (newPassword) {
        if (!currentPassword) {
          setMessage("❌ Debes ingresar tu contraseña actual.");
          return;
        }

        // 🔥 Reautenticación obligatoria
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

        await reauthenticateWithCredential(user, credential);

        // 🔥 Ahora sí se puede cambiar la contraseña
        await updatePassword(user, newPassword);

        // Notificar por email via Cloud Function
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

      setMessage("✅ Datos actualizados correctamente.");
      setNewPassword("");
      setCurrentPassword("");
    } catch (error) {
      console.error("❌ Error updating profile:", error);

      if (error.code === "auth/wrong-password") {
        setMessage("❌ La contraseña actual es incorrecta.");
      } else if (error.code === "auth/requires-recent-login") {
        setMessage("⚠ Debes volver a iniciar sesión para realizar este cambio.");
      } else {
        setMessage("❌ No se pudieron actualizar los datos.");
      }
    }
  };

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user]);

  // ============================================================
  // 🔥 Cargar pedidos iniciales
  // ============================================================
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

  return {
    id: docSnap.id,
    ...data,
    total: subtotal + shippingCost,
  };
});


    setOrders(docs);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setMoreAvailable(snapshot.docs.length === 3);

    setLoadingOrders(false);
  };

  // 🔥 Cargar más pedidos
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

    return {
      id: docSnap.id,
      ...data,
      total: subtotal + shippingCost,
    };
  });

  setOrders((prev) => [...prev, ...newDocs]);
  setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
  setMoreAvailable(snapshot.docs.length === 3);
};


  useEffect(() => {
    if (!loading && user) loadInitialOrders();
  }, [user, loading]);

  // ============================================
  // 🔥 Detectar si el usuario viene de Google
  // ============================================
  const isGoogleUser =
    user?.providerData?.some((p) => p.providerId === "google.com") || false;

  return (
    <div className="profile-container">
      <h2>Mi Perfil</h2>

      {user ? (
        <div className="profile-grid">
          {/* 🧾 PANEL IZQUIERDO — PEDIDOS */}
          <div className="orders-section">
            <h3>Mis Pedidos</h3>

            {loadingOrders ? (
              <p>Cargando tus pedidos...</p>
            ) : orders.length > 0 ? (
              <>
                <ul className="orders-list">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="order-card clickable-order"
                      onClick={() => navigate(`/order/${order.id}`)}
                    >
                      <div className="order-row">
                        <span className="order-label">Order ID:</span>
                        <span className="order-value order-id">{order.id}</span>
                      </div>

                      <div className="order-row">
                        <span className="order-label">Fecha:</span>
                        <span className="order-value">
                          {order.createdAt?.toDate
                            ? order.createdAt.toDate().toLocaleString()
                            : "Desconocida"}
                        </span>
                      </div>

                      <div className="order-row">
                        <span className="order-label">Total:</span>
                        <span className="order-value">
                          ${order.total?.toFixed(2)}
                        </span>
                      </div>

                      <div className="order-row">
                        <span className="order-label">Estado:</span>
                        <span
                          className={`status-badge ${
                            order.status === "approved" ? "approved" : "pending"
                          }`}
                        >
                          {order.status.charAt(0).toUpperCase() +
                            order.status.slice(1)}
                        </span>
                      </div>

                      <div className="order-row">
                        <span className="order-label">Despachado:</span>
                        <span
                          className={`dispatch-badge ${
                            order.dispatched ? "done" : "not-done"
                          }`}
                        >
                          {order.dispatched ? "Sí" : "No"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                {moreAvailable && (
                  <button onClick={loadMoreOrders} className="btn-load-more">
                    Cargar más
                  </button>
                )}
              </>
            ) : (
              <p>No tienes pedidos aún.</p>
            )}
          </div>

          {/* ⚙ PANEL DERECHO — Configuración */}
          <div className="settings-section">
            <h3>Configuración</h3>

            <div className="settings-form">
              <label>Nombre de usuario:</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />

              <label>Correo electrónico:</label>
              <input type="email" value={user.email} disabled />

              {/* ================================
                 🔥 CAMBIO DE CONTRASEÑA
              ================================== */}
              {!isGoogleUser ? (
                <>
                  <label>Contraseña actual:</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />

                  <label>Nueva contraseña:</label>
                  <input
                    type="password"
                    placeholder="********"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </>
              ) : (
                <p className="google-warning">
                  🔒 No podés cambiar contraseña porque tu cuenta usa inicio con
                  Google.
                </p>
              )}

              <button onClick={handleSaveChanges}>Guardar cambios</button>

              <button className="btn-logout" onClick={handleLogout}>
                Cerrar sesión
              </button>

              {message && <p className="update-message">{message}</p>}
            </div>
          </div>
        </div>
      ) : (
        <p>No estás logueado.</p>
      )}
    </div>
  );
};

export default Profile;
