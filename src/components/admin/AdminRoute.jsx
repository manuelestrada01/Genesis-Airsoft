import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useContext(AuthContext);

  // Mientras se carga el auth
  if (loading) return <p>Cargando...</p>;

  // No logueado → al login
  if (!user) return <Navigate to="/auth" />;

  // Logueado pero no admin → al home
  if (!isAdmin) return <Navigate to="/" />;

  // Todo OK → mostrar contenido admin
  return children;
}
