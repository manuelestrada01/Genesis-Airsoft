import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import CartWidget from "./CartWidget";
import logo from "../assets/LogoGenesis.png";
import AuthContext from "../context/AuthContext";
import "./NavBar.css";

const NavBarTop = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile"); // redirige a la sección del perfil
  };

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
          <input
            type="text"
            className="search-bar"
            placeholder="Buscar productos..."
          />
        </div>

        <div className="navbar-actions">
          <CartWidget />

          {!user ? (
            <Link to="/auth" className="login-btn" aria-label="Login / Register">
              <span className="btn-text">Login / Register</span>
              <FaUser className="user-icon" aria-hidden="true" />
            </Link>
          ) : (
            <button className="login-btn" onClick={handleProfileClick}>
              <FaUser style={{ marginRight: "8px" }} />
              Mi Perfil
            </button>
          )}
        </div>
      </header>
    </>
  );
};

export default NavBarTop;
