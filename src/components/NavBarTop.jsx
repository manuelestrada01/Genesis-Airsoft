import React from "react";
import { Link } from "react-router-dom"; // 👈 Importante para la navegación
import CartWidget from "./CartWidget";
import logo from "../assets/LogoGenesis.png";
import { FaSearch } from "react-icons/fa";
import "./NavBar.css";

const NavBarTop = () => {
  return (
    <>
      {/* Franja superior */}
      <div className="top-bar">Envíos a todo Argentina</div>

      {/* Navbar principal */}
      <header className="navbar-top" style={{ top: "30px" }}>
        <div className="navbar-logo">
          {/* 👇 Logo con Link a Home */}
          <Link to="/">
            <img src={logo} alt="Logo de la tienda" />
          </Link>
        </div>

        <div className="search-container">
          <input
            type="text"
            className="search-bar"
            placeholder="Buscar productos..."
          />
          <FaSearch className="search-icon" />
        </div>

        <div className="navbar-actions">
          <CartWidget />
          {/* 🔹 Link que redirige a la ruta /auth */}
          <Link to="/auth" className="login-btn">
            Login / Register
          </Link>
        </div>
      </header>
    </>
  );
};

export default NavBarTop;
