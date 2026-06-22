import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { FiMenu, FiX } from "react-icons/fi";
import { gsap } from "gsap";
import CartWidget from "./CartWidget";
import logo from "../assets/LogoGenesis.png";
import AuthContext from "../context/AuthContext";
import { getCategories } from "../firebase/db";
import "./NavBar.css";

const MobileNavBar = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("menu"); // "menu" | "categories"
  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(false);

  const handleSearchKey = (e) => {
    if (e.key === "Enter" && search.trim() !== "") {
      navigate(`/search?query=${encodeURIComponent(search.trim())}`);
      setOpen(false);
    }
  };

  // Traer categorías SOLO cuando se abre el drawer (y una sola vez)
  useEffect(() => {
    const fetchCats = async () => {
      try {
        setCatsLoading(true);
        const cats = await getCategories();
        setCategories(cats || []);
      } catch (err) {
        console.error("Error al traer categorías:", err);
      } finally {
        setCatsLoading(false);
      }
    };

    if (open && categories.length === 0) fetchCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Evita scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Ocultar navbar al scrollear hacia abajo, mostrar al subir
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let lastY = window.scrollY;
    let hidden = false;
    let rafId = null;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y    = window.scrollY;
        const diff = y - lastY;

        if (diff > 0 && y > 60 && !hidden) {
          hidden = true;
          gsap.to(el, { y: -el.offsetHeight, duration: 0.3, ease: "power2.in" });
        }

        if (diff < 0 && hidden) {
          hidden = false;
          gsap.to(el, { y: 0, duration: 0.38, ease: "power2.out" });
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

  const menuItems = useMemo(() => {
    const arr = [
      { label: "Inicio", to: "/" },
      { label: "Contacto", to: "/contacto" },
      { label: "Alquileres", to: "/alquileres" },
    ];

    // Admin (si corresponde)
    if (isAdmin) arr.push({ label: "Panel Admin", to: "/admin/products" });

    // Cuenta
    if (!user) arr.push({ label: "Login / Register", to: "/auth" });
    else arr.push({ label: "Mi Cuenta", to: "/profile" });

    return arr;
  }, [isAdmin, user]);

  return (
    <>
      {/* WRAPPER fijo — se anima como unidad al scrollear */}
      <div ref={wrapperRef} className="mnav-wrapper">
        <div className="top-bar">Envíos a todo Argentina</div>

      {/* HEADER (siempre visible) */}
      <header className="mnav-header">
        <button
          className="mnav-menuBtn"
          onClick={() => {
            setOpen(true);
            setTab("menu");
          }}
          aria-label="Abrir menú"
          type="button"
        >
          <FiMenu />
          <span>Menu</span>
        </button>

        <Link to="/" className="mnav-logo" aria-label="Ir al inicio">
          <img src={logo} alt="Logo de la tienda" />
        </Link>

        <div className="mnav-actions">
          <CartWidget />
          {!user ? (
            <button
              className="mnav-userBtn"
              onClick={() => navigate("/auth")}
              aria-label="Login / Register"
              type="button"
            >
              <FaUser />
            </button>
          ) : (
            <button
              className="mnav-userBtn"
              onClick={() => navigate("/profile")}
              aria-label="Mi Perfil"
              type="button"
            >
              <FaUser />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mnav-search">
          <input
            type="text"
            className="mnav-searchInput"
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
          />
        </div>
      </header>
      </div>{/* /mnav-wrapper */}

      {/* BACKDROP */}
      {open && (
        <button
          className="mnav-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
          type="button"
        />
      )}

      {/* DRAWER */}
      <aside className={`mnav-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="mnav-drawerTop">
          <button
            className="mnav-closeBtn"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            type="button"
          >
            <FiX />
          </button>

          <div className="mnav-tabs">
            <button
              type="button"
              className={`mnav-tab ${tab === "menu" ? "active" : ""}`}
              onClick={() => setTab("menu")}
            >
              MENU
            </button>
            <button
              type="button"
              className={`mnav-tab ${tab === "categories" ? "active" : ""}`}
              onClick={() => setTab("categories")}
            >
              CATEGORÍAS
            </button>
          </div>
        </div>

        <div className="mnav-content">
          {tab === "menu" && (
            <nav className="mnav-list">
              {menuItems.map((it) => (
                <Link
                  key={it.label}
                  to={it.to}
                  className="mnav-item"
                  onClick={() => setOpen(false)}
                >
                  {it.label}
                </Link>
              ))}
            </nav>
          )}

          {tab === "categories" && (
            <nav className="mnav-list">
              {catsLoading && <div className="mnav-loading">Cargando...</div>}

              {!catsLoading && categories.length === 0 && (
                <div className="mnav-loading">No hay categorías</div>
              )}

              {!catsLoading &&
                categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.name}`}
                    className="mnav-item"
                    onClick={() => setOpen(false)}
                  >
                    {cat.name}
                  </Link>
                ))}
            </nav>
          )}
        </div>
      </aside>
    </>
  );
};

export default MobileNavBar;
