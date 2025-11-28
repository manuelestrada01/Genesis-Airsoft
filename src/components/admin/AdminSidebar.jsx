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
      </nav>
    </div>
  );
  
}
