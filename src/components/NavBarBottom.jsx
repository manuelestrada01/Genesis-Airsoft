import React from "react";
import { Link } from "react-router-dom"; // 👈 importamos Link
import "./NavBar.css";

const NavBarBottom = () => {
  return (
    <nav className="navbar-bottom">
      <ul className="navbar-links">
        <li><Link to="/">Inicio</Link></li>
        <li className="dropdown">
          <span>Categorías</span>
          <ul className="dropdown-menu">
            <li><Link to="/category/Marcadoras AEG">Marcadoras AEG</Link></li>
            <li><Link to="/category/Marcadoras GBB">Marcadoras GBB</Link></li>
            <li><Link to="/category/Indumentaria">Indumentaria</Link></li>
            <li><Link to="/category/Accesorios">Accesorios</Link></li>
            <li><Link to="/category/Insumos">Insumos</Link></li>
          </ul>
        </li>
        <li><Link to="/contacto">Contacto</Link></li>
        <li className="dropdown">
          <span>Alquileres</span>
          <ul className="dropdown-menu">
            <li><Link to="/alquileres/capital-federal">Capital Federal</Link></li>
            <li><Link to="/alquileres/mendoza">Mendoza</Link></li>
          </ul>
        </li>
      </ul>
    </nav>
  );
};

export default NavBarBottom;
