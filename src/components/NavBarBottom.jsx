import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, getCategories } from "../firebase/db";
import "./NavBar.css";

const NavBarBottom = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error("Error al traer categorías:", error);
      }
    };

    fetchCategories();
  }, []);

  return (
    <nav className="navbar-bottom">
      <ul className="navbar-links">
        <li><Link to="/">Inicio</Link></li>

        <li className="dropdown">
          <span>Categorías</span>
          <ul className="dropdown-menu">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <li key={cat.id}>
                  <Link to={`/category/${cat.name}`}>{cat.name}</Link>
                </li>
              ))
            ) : (
              <li>Cargando...</li>
            )}
          </ul>
        </li>

        <li><Link to="/contacto">Contacto</Link></li>

        <li className="dropdown">
          <span>Alquileres</span>
          <ul className="dropdown-menu">
            <li><Link to="/alquileres/capital-federal">Capital Federal</Link></li>
            <li><Link to="/alquileres/mendoza">Mendoza</Link></li>
          </ul>
        </li>
      </ul>
    </nav>
  );
};

export default NavBarBottom;
