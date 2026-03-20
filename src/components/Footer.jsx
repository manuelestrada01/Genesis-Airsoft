// src/components/Footer.jsx
import React from "react";
import "./Footer.css";
import logo from "../assets/LogoGenesis.png"; // ajusta la ruta a tu logo

const Footer = () => {
  return (
    <footer className="footer">
      {/* Parte superior con el logo */}
      <div className="footer-top">
        <img src={logo} alt="Logo Genesis Airsoft" className="footer-logo" />
      </div>

      {/* Parte inferior con copyright */}
      <div className="footer-bottom">
        <p>Copyright ©️ 2023. Todos los derechos reservados.</p>
        <p className="footer-powered">Powered by Manuel Estrada</p>
      </div>
    </footer>
  );
};

export default Footer;
