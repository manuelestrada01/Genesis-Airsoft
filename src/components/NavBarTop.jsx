import React from "react";
import CartWidget from "./CartWidget";
import logo from "../assets/LogoGenesis.png";
import { FaSearch } from "react-icons/fa";
import "./NavBar.css";

const NavBarTop = () => {
  return (
    <>
      {/* Franja superior */}
      <div className="top-bar">
        Envíos a todo Argentina
      </div>

      {/* Navbar principal */}
      <header className="navbar-top" style={{ top: "30px" }}> {/* ajusta según altura de top-bar */}
        <div className="navbar-logo">
          <img src={logo} alt="Logo de la tienda" />
        </div>

        <div className="search-container">
          <input
            type="text"
            className="search-bar"
            placeholder="Buscar productos..."
          />
          <FaSearch className="search-icon" />
        </div>

        <CartWidget />
      </header>
    </>
  );
};

export default NavBarTop;
