import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import AuthContext from "../context/AuthContext";
import { updatePassword, updateProfile } from "firebase/auth";
import "./Profile.css";

const Profile = () => {
  const { user, logoutUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [displayName, setDisplayName] = useState("");
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
        await updatePassword(user, newPassword);
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

  useEffect(() => {
    const fetchOrders = async () => {
      if (loading || !user) return;

      try {
        console.log("🔎 Fetching orders for UID:", user.uid);
        const ordersRef = collection(db, "orders");
        const q = query(
          ordersRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const userOrders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setOrders(userOrders);
      } catch (error) {
        console.error("❌ Error loading orders:", error);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [user, loading]);

  return (
    <div className="profile-container">
      <h2>Mi Perfil</h2>

      {user ? (
        <div className="profile-grid">
          {/* 🧾 Panel Izquierdo: Órdenes */}
          <div className="orders-section">
            <h3>Mis Pedidos</h3>
            {loadingOrders ? (
              <p>Cargando tus pedidos...</p>
            ) : orders.length > 0 ? (
              <ul className="orders-list">
                {orders.map((order) => (
                  <li key={order.id} className="order-item">
                    <div>
                      <strong>Order ID:</strong> {order.id}
                    </div>
                    <div>
                      <strong>Fecha:</strong>{" "}
                      {order.createdAt?.toDate
                        ? order.createdAt.toDate().toLocaleString()
                        : "Desconocida"}
                    </div>
                    <div>
                      <strong>Total:</strong> $
                      {order.total?.toFixed(2) || "N/A"}
                    </div>
                    <div>
                      <strong>Estado:</strong>{" "}
                      {order.status
                        ? order.status.charAt(0).toUpperCase() +
                          order.status.slice(1)
                        : "Pending"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No tienes pedidos aún.</p>
            )}
          </div>

          {/* ⚙️ Panel Derecho: Configuración */}
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
