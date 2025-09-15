import React, { useState } from "react";
import "./Auth.css";
import { registerUser, loginUser } from "../services/authService"; // 👈 funciones de firebase

const Auth = () => {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(""); // Para mostrar errores
  const [success, setSuccess] = useState(""); // Para mostrar éxito

  // Manejo de cambios en los inputs
  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  // Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await loginUser(loginData.email, loginData.password);
      setSuccess("¡Login exitoso!");
      console.log("Usuario logueado:", loginData.email);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Registro
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await registerUser(
        registerData.username,
        registerData.email,
        registerData.password
      );
      setSuccess("¡Registro exitoso!");
      console.log("Usuario registrado:", registerData.email);
      setRegisterData({ username: "", email: "", password: "" });
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      {/* Mostrar errores o éxito */}
      {error && <p className="auth-error">{error}</p>}
      {success && <p className="auth-success">{success}</p>}

      {/* LOGIN */}
      <div className="auth-box">
        <h2>ACCEDER</h2>
        <form onSubmit={handleLoginSubmit}>
          <label>Correo electrónico *</label>
          <input
            type="email"
            name="email"
            value={loginData.email}
            onChange={handleLoginChange}
            required
          />
          <label>Password *</label>
          <input
            type="password"
            name="password"
            value={loginData.password}
            onChange={handleLoginChange}
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
            onChange={handleRegisterChange}
            required
          />
          <label>Dirección de correo electrónico *</label>
          <input
            type="email"
            name="email"
            value={registerData.email}
            onChange={handleRegisterChange}
            required
          />
          <label>Contraseña *</label>
          <input
            type="password"
            name="password"
            value={registerData.password}
            onChange={handleRegisterChange}
            required
          />
          <p className="privacy">🔒 Política de Privacidad y Protección de Datos</p>
          <button type="submit" className="btn-register">
            Registrarse
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
