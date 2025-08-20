
import React from 'react';
import CartWidget from "./CartWidget";
import './NavBar.css';
import logo from '../assets/LogoGenesis.png'; // Ajusta la ruta si es diferente

const NavBar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <img src={logo} alt="Logo de la tienda" />
      </div>

      <ul className="navbar-links">
  <li><a href="#">Inicio</a></li>

  <li className="dropdown">
    <a href="#">Categorías</a>
    <ul className="dropdown-menu">
      <li><a href="#">Marcadoras AEG</a></li>
      <li><a href="#">Marcadoras GBB</a></li>
      <li><a href="#">Indumentaria</a></li>
      <li><a href="#">Insumos</a></li>
      <li><a href="#">Partes/Accesorios</a></li>
    </ul>
  </li>

  <li><a href="#">Contacto</a></li>
</ul>


      <CartWidget />
    </nav>
  );
};

export default NavBar;
