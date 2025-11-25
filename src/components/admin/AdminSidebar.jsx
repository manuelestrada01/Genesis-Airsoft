import React from "react";
import { Link } from "react-router-dom";
import "./admin.css";

export default function AdminSidebar() {
  return (
    <div className="admin-sidebar">
      <h2 className="admin-title">Admin Panel</h2>

      <ul className="admin-menu">
        <li><Link to="/admin">Dashboard</Link></li>
        <li><Link to="/admin/products">Productos</Link></li>
        <li><Link to="/admin/products/add">Agregar Producto</Link></li>
      </ul>
    </div>
  );
}
