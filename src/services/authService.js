// src/services/authService.js
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

// Registrar usuario
export const registerUser = async (name, email, password) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(auth.currentUser, { displayName: name });
  return userCredential.user;
};

// Login usuario
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

// Logout
export const logoutUser = async () => {
  await auth.signOut();
};
