import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import CartWidget from "./CartWidget";
import logo from "../assets/LogoGenesis.png";
import AuthContext from "../context/AuthContext";
import "./NavBar.css";

const NavBarTop = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const handleSearchKey = (e) => {
    if (e.key === "Enter" && search.trim() !== "") {
      navigate(`/search?query=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <>
      <div className="top-bar">Envíos a todo Argentina</div>

      <header className="navbar-top">
        <div className="navbar-logo">
          <Link to="/">
            <img src={logo} alt="Logo de la tienda" />
          </Link>
        </div>

        {/* 🔥 Búsqueda funcional */}
        <div className="search-container">
          <input
            type="text"
            className="search-bar"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
          />
        </div>

        <div className="navbar-actions">
          <CartWidget />

          {isAdmin && (
            <Link to="/admin/products" className="admin-btn">
              Panel Admin
            </Link>
          )}

          {!user ? (
            <Link to="/auth" className="login-btn">
              <span className="btn-text">Login / Register</span>
              <FaUser className="user-icon" />
            </Link>
          ) : (
            <button className="login-btn" onClick={() => navigate("/profile")}>
              <FaUser style={{ marginRight: 8 }} />
              Mi Perfil
            </button>
          )}
        </div>
      </header>
    </>
  );
};

export default NavBarTop;
