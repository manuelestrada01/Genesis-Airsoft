import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import AuthContext from "../context/AuthContext";
import "./Profile.css";

const Profile = () => {
  const { user, logoutUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (loading || !user) return; // ✅ espera a que user esté listo

      try {
        console.log("🔎 Fetching orders for UID:", user.uid);
        const ordersRef = collection(db, "orders");
        const q = query(
          ordersRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc") // 🔹 requiere índice compuesto
        );

        const querySnapshot = await getDocs(q);
        const userOrders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log("📦 Orders found:", userOrders.length);
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
      <h2>My Profile</h2>

      {user ? (
        <>
          <div className="profile-info">
            <p><strong>Username:</strong> {user.displayName || user.email}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>

          <div className="profile-actions">
            <h3>My Orders</h3>

            {loadingOrders ? (
              <p>Loading your orders...</p>
            ) : orders.length > 0 ? (
              <ul className="orders-list">
                {orders.map((order) => (
                  <li key={order.id} className="order-item">
                    <div>
                      <strong>Order ID:</strong> {order.id}
                    </div>
                    <div>
                      <strong>Date:</strong>{" "}
                      {order.createdAt?.toDate
                        ? order.createdAt.toDate().toLocaleString()
                        : "Unknown"}
                    </div>
                    <div>
                      <strong>Total:</strong> ${order.total?.toFixed(2) || "N/A"}
                    </div>
                    <div>
                      <strong>Status:</strong> {order.status || "Pending"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>You have no orders yet.</p>
            )}

            <button className="btn-logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </>
      ) : (
        <p>You are not logged in.</p>
      )}
    </div>
  );
};

export default Profile;
