import React from "react";
import { Link } from "react-router-dom";
import { FaUser, FaSearch } from "react-icons/fa";
import CartWidget from "./CartWidget";
import logo from "../assets/LogoGenesis.png";
import "./NavBar.css";

const NavBarTop = () => {
  return (
    <>
      <div className="top-bar">Envíos a todo Argentina</div>

      <header className="navbar-top" style={{ top: "30px" }}>
        <div className="navbar-logo">
          <Link to="/">
            <img src={logo} alt="Logo de la tienda" />
          </Link>
        </div>

        <div className="search-container">
          <input type="text" className="search-bar" placeholder="Buscar productos..." />
          <FaSearch className="search-icon" />
        </div>

        <div className="navbar-actions">
          <CartWidget />

          {/* Botón Login: texto visible, icono oculto por defecto */}
          <Link to="/auth" className="login-btn" aria-label="Login / Register">
            <span className="btn-text">Login / Register</span>
            <FaUser className="user-icon" aria-hidden="true" />
          </Link>
        </div>
      </header>
    </>
  );
};

export default NavBarTop;
