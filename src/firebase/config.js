// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuración de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCRtk56hQ202M3FfXsXvzOT4PsQ7vF5F_I",
  authDomain: "genesis-airsoft.firebaseapp.com",
  projectId: "genesis-airsoft",
  storageBucket: "genesis-airsoft.firebasestorage.app",   // ⬅️ CORREGIDO
  messagingSenderId: "352857393989",
  appId: "1:352857393989:web:6ac9ef76dd80c41d280c2c"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
