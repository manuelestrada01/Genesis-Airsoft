// src/components/Auth.jsx
import React, { useState, useContext } from "react";
import "./Auth.css";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const { registerUser, loginUser } = useContext(AuthContext);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");

  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  const navigate = useNavigate();

  // Inputs handlers
  const handleChange = (e, type) => {
    if (type === "login") {
      setLoginData({ ...loginData, [e.target.name]: e.target.value });
    } else {
      setRegisterData({ ...registerData, [e.target.name]: e.target.value });
    }
  };

  // 🔐 LOGIN
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");

    try {
      await loginUser(loginData.email, loginData.password);
      setLoginSuccess("¡Login exitoso!");
      navigate("/");
    } catch (err) {
      console.error("❌ Error Login:", err.code, err.message);

      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
          setLoginError("❌ La contraseña es incorrecta.");
          break;

        case "auth/user-not-found":
          setLoginError("❌ No existe una cuenta con ese correo.");
          break;

        case "auth/invalid-email":
          setLoginError("❌ El formato de email no es válido.");
          break;

        case "auth/too-many-requests":
          setLoginError(
            "❌ Demasiados intentos fallidos. Intentá de nuevo más tarde."
          );
          break;

        default:
          setLoginError("❌ Error al iniciar sesión. Intentalo nuevamente.");
          break;
      }
    }
  };

  // 🆕 REGISTRO
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError("");
    setRegisterSuccess("");

    try {
      await registerUser(
        registerData.username,
        registerData.email,
        registerData.password
      );
      setRegisterSuccess("¡Registro exitoso!");
      navigate("/");
    } catch (err) {
      console.error("❌ Error Register:", err.code, err.message);
      setRegisterError("❌ Error al registrarse: " + err.message);
    }
  };

  return (
    <div className="auth-container">
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

          {/* 🔥 Mensajes de LOGIN */}
          {loginError && <p className="auth-error">{loginError}</p>}
          {loginSuccess && <p className="auth-success">{loginSuccess}</p>}
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

          {/* 🔥 Mensajes de REGISTRO */}
          {registerError && <p className="auth-error">{registerError}</p>}
          {registerSuccess && (
            <p className="auth-success">{registerSuccess}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Auth;
