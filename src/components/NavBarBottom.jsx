import React from "react";
import "./NavBar.css";

const NavBarBottom = () => {
  return (
    <nav className="navbar-bottom">
      <ul className="navbar-links">
        <li><a href="#">Inicio</a></li>
        <li className="dropdown">
          <a href="#">Categorías</a>
          <ul className="dropdown-menu">
            <li><a href="#">Marcadoras AEG</a></li>
            <li><a href="#">Marcadoras GBB</a></li>
            <li><a href="#">Indumentaria</a></li>
            <li><a href="#">Partes/Accesorios</a></li>
          </ul>
        </li>
        <li><a href="#">Contacto</a></li>
      </ul>
    </nav>
  );
};

export default NavBarBottom;
