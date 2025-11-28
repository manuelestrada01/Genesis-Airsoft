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
import { updatePassword, updateProfile } from "firebase/auth";
import "./Profile.css";

const Profile = () => {
  const { user, logoutUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [moreAvailable, setMoreAvailable] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  // 🔥 Guardar cambios de usuario
  const handleSaveChanges = async () => {
    try {
      setMessage("");

      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      if (newPassword) {
        await updatePassword(user, newPassword);

        // Notificar por email
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
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      setMessage("❌ No se pudieron actualizar los datos.");
    }
  };

  useEffect(() => {
    if (user?.displayName) setDisplayName(user.displayName);
  }, [user]);

  // 🔥 Cargar primeros pedidos
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

    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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

    const newDocs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setOrders((prev) => [...prev, ...newDocs]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    setMoreAvailable(snapshot.docs.length === 3);
  };

  useEffect(() => {
    if (!loading && user) {
      loadInitialOrders();
    }
  }, [user, loading]);

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
                      <span className="order-value">${order.total?.toFixed(2)}</span>
                    </div>

                    <div className="order-row">
                      <span className="order-label">Estado:</span>
                      <span
                        className={`status-badge ${
                          order.status === "approved" ? "approved" : "pending"
                        }`}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>

                    <div className="order-row">
                      <span className="order-label">Despachado:</span>
                      <span
                        className={`dispatch-badge ${order.dispatched ? "done" : "not-done"}`}
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

              <label>Nueva contraseña:</label>
              <input
                type="password"
                placeholder="********"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

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
