import React from "react";
import { Link } from "react-router-dom";
import { FaInstagram, FaWhatsapp, FaFacebookF } from "react-icons/fa";
import "./Footer.css";
import logo from "../assets/LogoGenesis.png";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-grid">
        {/* Brand */}
        <div className="footer-brand footer-col">
          <img src={logo} alt="Genesis Airsoft" className="footer-logo" />
        </div>

        {/* Social */}
        <div className="footer-col">
<div className="footer-social">
            <a href="https://instagram.com/genesis_airsoft" target="_blank" rel="noopener noreferrer">
              <FaInstagram /> @genesis_airsoft
            </a>
            <a href="https://wa.me/541130441967" target="_blank" rel="noopener noreferrer">
              <FaWhatsapp /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      <hr className="footer-divider" />

      <div className="footer-bottom">
        <p>Copyright © {new Date().getFullYear()} Genesis Airsoft. Todos los derechos reservados.</p>
        <p className="footer-powered">
          Powered by <a href="https://m-estrada.vercel.app/" target="_blank" rel="noopener noreferrer">Manuel Estrada</a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
