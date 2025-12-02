// src/components/Auth.jsx
import React, { useState, useContext } from "react";
import "./Auth.css";
import AuthContext from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

// Firebase
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config";

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

  // ➤ Recuperar contraseña
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");
  const [showReset, setShowReset] = useState(false);

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
        case "auth/email-not-verified":
          setLoginError(
            "⚠ Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."
          );
          break;

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
            "❌ Demasiados intentos fallidos. Intentá más tarde."
          );
          break;

        default:
          setLoginError("❌ Error al iniciar sesión.");
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
      const result = await registerUser(
        registerData.username,
        registerData.email,
        registerData.password
      );

      setRegisterSuccess(result.message); // mensaje: revisar email
    } catch (err) {
      console.error("❌ Error Register:", err.code, err.message);

      switch (err.code) {
        case "auth/email-already-in-use":
          setRegisterError("❌ Ese correo ya está registrado.");
          break;

        case "auth/invalid-email":
          setRegisterError("❌ El correo no es válido.");
          break;

        case "auth/weak-password":
          setRegisterError("❌ La contraseña debe tener al menos 6 caracteres.");
          break;

        default:
          setRegisterError("❌ Error al registrarse: " + err.message);
          break;
      }
    }
  };

  // 🔄 RECUPERACIÓN DE CONTRASEÑA
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(
        "📩 Se envió un email con instrucciones para restablecer tu contraseña."
      );
      setResetEmail("");
    } catch (err) {
      console.error("Error reset password:", err.code);

      switch (err.code) {
        case "auth/user-not-found":
          setResetError("❌ No existe una cuenta con ese correo.");
          break;
        case "auth/invalid-email":
          setResetError("❌ El email no es válido.");
          break;
        default:
          setResetError("❌ Error al enviar el email.");
          break;
      }
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

          {/* ENLACE OLVIDÉ MI CONTRASEÑA */}
          <p
            className="forgot-password-link"
            onClick={() => setShowReset(!showReset)}
          >
            ¿Olvidaste tu contraseña?
          </p>

          {loginError && <p className="auth-error">{loginError}</p>}
          {loginSuccess && <p className="auth-success">{loginSuccess}</p>}
        </form>

        {/* FORM RECUPERACIÓN CONTRASEÑA */}
        {showReset && (
          <div className="reset-box">
            <h3>Restablecer contraseña</h3>

            <form onSubmit={handlePasswordReset}>
              <label>Correo electrónico</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />

              <button type="submit" className="btn-reset">
                Enviar enlace
              </button>
            </form>

            {resetError && <p className="auth-error">{resetError}</p>}
            {resetSuccess && <p className="auth-success">{resetSuccess}</p>}
          </div>
        )}
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

          <label>Correo electrónico *</label>
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
