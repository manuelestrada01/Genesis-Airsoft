import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  // Mientras firebase revisa login → spinner
  if (loading) return <p>Cargando...</p>;

  // Si no hay usuario → llevar al login
  if (!user) return <Navigate to="/auth" />;

  // Si no es admin → mandar a inicio
  const isAdmin = user?.reloadUserInfo?.customAttributes === '{"role":"admin"}';

  if (!isAdmin) return <Navigate to="/" />;

  // Si pasa todo → permitir acceso
  return children;
}
