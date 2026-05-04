import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FaInstagram, FaWhatsapp, FaFacebookF } from "react-icons/fa";
import "./Footer.css";
import logo from "../assets/LogoGenesis.png";

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const footerRef = useRef(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;

    gsap.from(el.querySelectorAll(".footer-col, .footer-brand"), {
      y: 24,
      opacity: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        once: true,
      },
    });

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  return (
    <footer className="footer" ref={footerRef}>
      <div className="footer-grid">
        {/* Brand */}
        <div className="footer-brand footer-col">
          <img src={logo} alt="Genesis Airsoft" className="footer-logo" />
          <p className="footer-tagline">Marcadoras AEG · GBB · Accesorios</p>
        </div>

        {/* Links */}
        <div className="footer-col">
          <h4>Tienda</h4>
          <ul className="footer-links">
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/category/marcadoras">Marcadoras</Link></li>
            <li><Link to="/category/accesorios">Accesorios</Link></li>
            <li><Link to="/cart">Carrito</Link></li>
          </ul>
        </div>

        {/* Social */}
        <div className="footer-col">
          <h4>Contacto</h4>
          <div className="footer-social">
            <a href="https://instagram.com/genesis.airsoft.ar" target="_blank" rel="noopener noreferrer">
              <FaInstagram /> @genesis.airsoft.ar
            </a>
            <a href="https://wa.me/5491100000000" target="_blank" rel="noopener noreferrer">
              <FaWhatsapp /> WhatsApp
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <FaFacebookF /> Facebook
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
