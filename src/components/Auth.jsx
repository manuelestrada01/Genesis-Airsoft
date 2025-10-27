// src/components/Auth.jsx
import React, { useState, useContext } from "react";
import "./Auth.css";
import AuthContext from "../context/AuthContext"; // 👈 usamos el contexto
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const { registerUser, loginUser, user } = useContext(AuthContext); // 👈 traemos también el user si lo querés usar

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Inputs handlers
  const handleChange = (e, type) => {
    if (type === "login") {
      setLoginData({ ...loginData, [e.target.name]: e.target.value });
    } else {
      setRegisterData({ ...registerData, [e.target.name]: e.target.value });
    }
  };

const navigate = useNavigate();
  // Login
const handleLoginSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");
  try {
    await loginUser(loginData.email, loginData.password);
    setSuccess("¡Login exitoso!");
    navigate("/"); // 🔹 redirige a Home
  } catch (err) {
    setError("Dirección de correo electrónico o contraseña desconocida");
  }
};

  // Registro
const handleRegisterSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setSuccess("");
  try {
    await registerUser(registerData.username, registerData.email, registerData.password);
    setSuccess("¡Registro exitoso!");
    navigate("/"); // 🔹 redirige a Home
  } catch (err) {
    setError("Error al registrarse: " + err.message);
  }
};


  return (
    <div className="auth-container">
     <div className="auth-messages">
        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}
      </div>
      {/* LOGIN */}
      <div className="auth-box">
        <h2>ACCEDER</h2>
        <form onSubmit={handleLoginSubmit}>
          <label>Correo electrónico *</label>
          <input
            type="email"
            name="email"
            value={loginData.email}
            onChange={(e) => handleChange(e, "login")}
            required
          />
          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={loginData.password}
            onChange={(e) => handleChange(e, "login")}
            required
          />
          <button type="submit" className="btn-login">
            LOG IN
          </button>
        </form>
      </div>

      {/* REGISTER */}
      <div className="auth-box">
        <h2>REGISTRARSE</h2>
        <form onSubmit={handleRegisterSubmit}>
          <label>Nombre de usuario *</label>
          <input
            type="text"
            name="username"
            value={registerData.username}
            onChange={(e) => handleChange(e, "register")}
            required
          />
          <label>Dirección de correo electrónico *</label>
          <input
            type="email"
            name="email"
            value={registerData.email}
            onChange={(e) => handleChange(e, "register")}
            required
          />
          <label>Contraseña *</label>
          <input
            type="password"
            name="password"
            value={registerData.password}
            onChange={(e) => handleChange(e, "register")}
            required
          />
          <p className="privacy">
            🔒 Política de Privacidad y Protección de Datos
          </p>
          <button type="submit" className="btn-register">
            Registrarse
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
