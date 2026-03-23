// src/context/AuthProvider.jsx
import React, { useState, useEffect } from "react";
import AuthContext from "./AuthContext";
import { auth } from "../firebase/config";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 🔥 Cargar claims del usuario
  const loadUserClaims = async (firebaseUser) => {
    if (!firebaseUser) {
      setIsAdmin(false);
      return;
    }

    const tokenResult = await firebaseUser.getIdTokenResult(true);
    const role = tokenResult.claims.role || "user";

    firebaseUser.role = role;
    setIsAdmin(role === "admin");
  };

  // 🔥 Detectar cambios de sesión
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await currentUser.getIdToken(true);
        await loadUserClaims(currentUser);
        setUser(currentUser);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 🟢 Registrar usuario + enviar verificación + desloguear
  const registerUser = async (name, email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(userCredential.user, { displayName: name });

    // Enviar mail de verificación
    await sendEmailVerification(userCredential.user);

    // Desloguear hasta que verifique el correo
    await signOut(auth);

    return {
      emailSent: true,
      message:
        "Se envió un correo de verificación. Por favor revisá tu email antes de iniciar sesión.",
    };
  };

  // 🟢 Login con verificación obligatoria
  const loginUser = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!credential.user.emailVerified) {
      await signOut(auth);
      const error = new Error("Email no verificado");
      error.code = "auth/email-not-verified";
      throw error;
    }

    await credential.user.getIdToken(true);
    await loadUserClaims(credential.user);
    setUser(credential.user);

    return credential.user;
  };

  // 🟢 Login con Google
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    await credential.user.getIdToken(true);
    await loadUserClaims(credential.user);
    setUser(credential.user);
    return credential.user;
  };

  // 🟢 Logout
  const logoutUser = async () => {
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        registerUser,
        loginUser,
        loginWithGoogle,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
