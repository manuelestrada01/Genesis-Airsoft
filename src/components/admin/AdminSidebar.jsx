import React from "react";
import { Link } from "react-router-dom";
import "./admin.css";

const Icon = ({ children }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {children}
  </svg>
);

const IcoDashboard = () => <Icon><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></Icon>;
const IcoBox = () => <Icon><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Icon>;
const IcoPlus = () => <Icon><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const IcoOrders = () => <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Icon>;
const IcoPartidas = () => <Icon><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></Icon>;
const IcoCalendar = () => <Icon><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>;
const IcoSettings = () => <Icon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>;
const IcoWrench = () => <Icon><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></Icon>;
const IcoTag = () => <Icon><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></Icon>;
const IcoReservas = () => <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>;
const IcoPresupuesto = () => <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></Icon>;

export default function AdminSidebar() {
  return (
    <div className="admin-sidebar">
      <h2 className="admin-title">Panel Admin</h2>

      <nav className="admin-menu">
        <Link to="/admin" className="admin-link"><IcoDashboard /> Dashboard</Link>
        <Link to="/admin/products" className="admin-link"><IcoBox /> Productos</Link>
        <Link to="/admin/products/add" className="admin-link"><IcoPlus /> Agregar Producto</Link>
        <Link to="/admin/orders" className="admin-link"><IcoOrders /> Pedidos</Link>

        <div style={{ borderTop: "1px solid #2a2a2a", margin: "12px 0" }} />

        <Link to="/admin/partidas" className="admin-link"><IcoPartidas /> Partidas</Link>
        <Link to="/admin/partidas/add" className="admin-link"><IcoPlus /> Nueva Partida</Link>
        <Link to="/admin/alquileres" className="admin-link"><IcoReservas /> Reservas Alquiler</Link>
        <Link to="/admin/rental-config" className="admin-link"><IcoSettings /> Config Alquileres</Link>

        <div style={{ borderTop: "1px solid #2a2a2a", margin: "12px 0" }} />

        <Link to="/admin/servicio" className="admin-link"><IcoWrench /> Turnos Servicio</Link>
        <Link to="/admin/servicio/config" className="admin-link"><IcoSettings /> Config Servicio</Link>
        <Link to="/admin/servicio/calendario" className="admin-link"><IcoCalendar /> Calendario Turnos</Link>

        <div style={{ borderTop: "1px solid #2a2a2a", margin: "12px 0" }} />

        <Link to="/admin/etiqueta" className="admin-link"><IcoTag /> Etiqueta de Despacho</Link>

        <div style={{ borderTop: "1px solid #2a2a2a", margin: "12px 0" }} />

        <Link to="/admin/presupuestos-manuales" className="admin-link"><IcoPresupuesto /> Presupuestos Manuales</Link>
      </nav>
    </div>
  );
}
