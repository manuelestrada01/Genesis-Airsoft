import React from "react";
import AdminSidebar from "./AdminSidebar";
import "./admin.css";

export default function AdminDashboard() {
  return (
    <div className="admin-container">
      <AdminSidebar />

      <div className="admin-content">
        <h1>Panel de Administrador</h1>
        <p>Bienvenido al panel administrativo de Genesis Airsoft.</p>

        <div className="admin-cards">
          <div className="admin-card">Gestionar Productos</div>
          <div className="admin-card">Órdenes (próximamente)</div>
          <div className="admin-card">Usuarios (próximamente)</div>
        </div>
      </div>
    </div>
  );
}
