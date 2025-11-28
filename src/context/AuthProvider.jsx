import React, { useState, useEffect } from "react";
import AuthContext from "./AuthContext";
import { auth } from "../firebase/config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // 👈 NUEVO

  // 🔥 Función para leer claims del usuario
  const loadUserClaims = async (firebaseUser) => {
    if (!firebaseUser) {
      setIsAdmin(false);
      return;
    }

    const tokenResult = await firebaseUser.getIdTokenResult(true); // fuerza refresh
    const role = tokenResult.claims.role;

    console.log("🔐 Claims del usuario:", tokenResult.claims);

    setIsAdmin(role === "admin");
  };

  // 🟢 Detecta cambios de sesión
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      await currentUser.getIdToken(true);
      const tokenResult = await currentUser.getIdTokenResult();
      const role = tokenResult.claims.role || "user";

      // 👇 NO CLONAMOS, MODIFICAMOS EL OBJETO ORIGINAL
      currentUser.role = role;

      setUser(currentUser);
    } else {
      setUser(null);
    }

    setLoading(false);
  });

  return () => unsubscribe();
}, []);



  // 🟢 Registrar usuario
  const registerUser = async (name, email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(auth.currentUser, { displayName: name });

    await loadUserClaims(auth.currentUser); // 👈 importante
    setUser(auth.currentUser);
    return auth.currentUser;
  };

  // 🟢 Login usuario
  const loginUser = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    await auth.currentUser.getIdToken(true); // 🔥 fuerza refresh del token

    await loadUserClaims(auth.currentUser); // 👈 importante
    setUser(auth.currentUser);
    return auth.currentUser;
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
        isAdmin,        // 👈 EXPUSE ESTO AL CONTEXTO
        registerUser,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
