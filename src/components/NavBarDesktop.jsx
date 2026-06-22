import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { FiSearch, FiX, FiChevronDown } from "react-icons/fi";
import { gsap } from "gsap";
import CartWidget from "./CartWidget";
import logo from "../assets/LogoGenesis.png";
import AuthContext from "../context/AuthContext";
import { getCategories } from "../firebase/db";
import "./NavBar.css";

const NavBarDesktop = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const wrapperRef      = useRef(null);
  const searchPanelRef  = useRef(null);
  const searchInputRef  = useRef(null);

  const [search, setSearch]         = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [scrolled, setScrolled]     = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  // Entrance animation
  useEffect(() => {
    gsap.from(wrapperRef.current, {
      y: -110, duration: 0.55, ease: "power3.out", clearProps: "y",
    });
  }, []);

  // Scroll: hide/show + glass effect
  useEffect(() => {
    const el = wrapperRef.current;
    let lastY  = window.scrollY;
    let hidden = false;
    let rafId  = null;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y    = window.scrollY;
        const diff = y - lastY;

        setScrolled(y > 10);

        if (diff > 4 && y > 80 && !hidden) {
          hidden = true;
          gsap.to(el, { y: "-100%", duration: 0.3, ease: "power2.in", overwrite: true });
        } else if (diff < -4 && hidden) {
          hidden = false;
          gsap.to(el, { y: "0%", duration: 0.38, ease: "power2.out", overwrite: true });
        }

        lastY = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => {
      if (searchPanelRef.current) {
        gsap.fromTo(
          searchPanelRef.current,
          { opacity: 0, y: -8 },
          {
            opacity: 1, y: 0, duration: 0.22, ease: "power2.out",
            onComplete: () => searchInputRef.current?.focus(),
          }
        );
      }
    });
  };

  const closeSearch = () => {
    if (!searchPanelRef.current) return;
    gsap.to(searchPanelRef.current, {
      opacity: 0, y: -8, duration: 0.18, ease: "power2.in",
      onComplete: () => { setSearchOpen(false); setSearch(""); },
    });
  };

  const handleSearchKey = (e) => {
    if (e.key === "Enter" && search.trim()) {
      navigate(`/search?query=${encodeURIComponent(search.trim())}`);
      closeSearch();
    }
    if (e.key === "Escape") closeSearch();
  };

  return (
    <div ref={wrapperRef} className="nd-wrapper">
      {/* Announcement bar */}
      <div className="top-bar">Envíos a todo Argentina</div>

      {/* Single nav row */}
      <nav className={`nd-nav${scrolled ? " nd-scrolled" : ""}`}>

        {/* Logo — left */}
        <div className="nd-logo">
          <Link to="/">
            <img src={logo} alt="Genesis Airsoft" />
          </Link>
        </div>

        {/* Links — center */}
        <ul className="nd-links">
          <li>
            <NavLink to="/" end>Inicio</NavLink>
          </li>

          <li className="nd-dropdown">
            <button className="nd-dropbtn" type="button">
              Categorías <FiChevronDown className="nd-chevron" />
            </button>
            <ul className="nd-dropmenu">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/category/${cat.name}`}>{cat.name}</Link>
                  </li>
                ))
              ) : (
                <li className="nd-droploading">Cargando...</li>
              )}
            </ul>
          </li>

          <li>
            <NavLink to="/contacto">Contacto</NavLink>
          </li>

          <li>
            <NavLink to="/alquileres">Alquileres</NavLink>
          </li>
        </ul>

        {/* Actions — right */}
        <div className="nd-actions">
          <button
            className="nd-icon-btn"
            onClick={searchOpen ? closeSearch : openSearch}
            aria-label="Buscar"
            type="button"
          >
            {searchOpen ? <FiX /> : <FiSearch />}
          </button>

          <CartWidget />

          {isAdmin && (
            <Link to="/admin/products" className="nd-admin-btn">Admin</Link>
          )}

          {!user ? (
            <Link to="/auth" className="nd-icon-btn" aria-label="Ingresar">
              <FaUser />
            </Link>
          ) : (
            <button className="nd-icon-btn" onClick={() => navigate("/profile")} type="button" aria-label="Mi Perfil">
              <FaUser />
            </button>
          )}
        </div>
      </nav>

      {/* Search overlay panel */}
      {searchOpen && (
        <div ref={searchPanelRef} className="nd-search-overlay">
          <div className="nd-search-inner">
            <FiSearch className="nd-search-ico" />
            <input
              ref={searchInputRef}
              className="nd-search-input"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
            />
            <button
              className="nd-search-close"
              onClick={closeSearch}
              type="button"
              aria-label="Cerrar búsqueda"
            >
              <FiX />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavBarDesktop;
