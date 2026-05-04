import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { gsap } from "gsap";
import CartWidget from "./CartWidget";
import logo from "../assets/LogoGenesis.png";
import AuthContext from "../context/AuthContext";
import "./NavBar.css";

// Total height of navbar group: top-bar(30) + navbar-top(~120) + navbar-bottom(46) = ~196px
const NAVBAR_HEIGHT = 196;

const NavBarTop = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);   // wraps top-bar + navbar-top + navbar-bottom
  const topBarRef  = useRef(null);
  const headerRef  = useRef(null);

  const [search, setSearch] = useState("");

  // Entrance animation on mount
  useEffect(() => {
    const tl = gsap.timeline();
    tl.from(topBarRef.current, {
      y: -30, opacity: 0, duration: 0.4, ease: "power2.out",
    }).from(headerRef.current, {
      y: -20, opacity: 0, duration: 0.5, ease: "power2.out",
    }, "-=0.1");
  }, []);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    let lastY   = window.scrollY;
    let hidden  = false;
    let rafId   = null;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff     = currentY - lastY;

        // Scrolled down past threshold and navbar visible → hide
        if (diff > 0 && currentY > NAVBAR_HEIGHT && !hidden) {
          hidden = true;
          gsap.to(wrapperRef.current, {
            y: -NAVBAR_HEIGHT - 10,
            duration: 0.35,
            ease: "power2.in",
          });
        }

        // Scrolled up → show
        if (diff < 0 && hidden) {
          hidden = false;
          gsap.to(wrapperRef.current, {
            y: 0,
            duration: 0.4,
            ease: "power2.out",
          });
        }

        lastY = currentY;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleSearchKey = (e) => {
    if (e.key === "Enter" && search.trim() !== "") {
      navigate(`/search?query=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <div ref={wrapperRef} className="navbar-wrapper">
      <div className="top-bar" ref={topBarRef}>Envíos a todo Argentina</div>

      <header className="navbar-top" ref={headerRef}>
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
    </div>
  );
};

export default NavBarTop;
