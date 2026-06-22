import React from "react";
import { Link } from "react-router-dom";
import "./admin.css";

export default function AdminSidebar() {
  return (
    <div className="admin-sidebar">
      <h2 className="admin-title">Panel Admin</h2>

      <nav className="admin-menu">
        <Link to="/admin" className="admin-link">🏠 Dashboard</Link>
        <Link to="/admin/products" className="admin-link">📦 Productos</Link>
        <Link to="/admin/products/add" className="admin-link">➕ Agregar Producto</Link>
        <Link to="/admin/orders" className="admin-link">🧾 Pedidos</Link>

        <div style={{ borderTop: "1px solid #2a2a2a", margin: "12px 0" }} />

        <Link to="/admin/partidas" className="admin-link">🎯 Partidas</Link>
        <Link to="/admin/partidas/add" className="admin-link">➕ Nueva Partida</Link>
        <Link to="/admin/alquileres" className="admin-link">📋 Reservas Alquiler</Link>
        <Link to="/admin/rental-config" className="admin-link">⚙️ Config Alquileres</Link>
      </nav>
    </div>
  );
  
}
