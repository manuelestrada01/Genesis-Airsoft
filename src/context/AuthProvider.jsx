import React, { useState, useEffect } from "react";
import AuthContext from "./AuthContext"; // 👈 Import correcto
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

  // Detectar cambios de sesión
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Registrar usuario
  const registerUser = async (name, email, password) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(auth.currentUser, { displayName: name });
    setUser(auth.currentUser);
    return auth.currentUser;
  };

  // Login usuario
  const loginUser = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    setUser(auth.currentUser);
    return auth.currentUser;
  };

  // Logout usuario
  const logoutUser = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, registerUser, loginUser, logoutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
