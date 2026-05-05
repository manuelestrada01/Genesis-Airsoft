// src/firebase/config.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Configuración de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCRtk56hQ202M3FfXsXvzOT4PsQ7vF5F_I",
  authDomain: "genesis-airsoft.firebaseapp.com",
  projectId: "genesis-airsoft",
  storageBucket: "genesis-airsoft.firebasestorage.app",
  messagingSenderId: "352857393989",
  appId: "1:352857393989:web:6ac9ef76dd80c41d280c2c",
  measurementId: "G-PR5Z2RDEYM",
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// ============================================================
// 🔒 1. Fijar persistencia a Sesión (NO localStorage / IndexedDB)
//    Evita restaurar sesiones antiguas automáticamente
// ============================================================
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error("Error setting persistence:", err);
});

// ============================================================
// 🔒 2. LIMPIAR estados de autenticación por redirección
//    Firebase puede guardar tokens temporales cuando MP redirige
//    Esto evita que se re-use un login previo (como el admin)
// ============================================================
try {
  const redirectKey = `firebase:redirectOperation:${auth.name}`;
  localStorage.removeItem(redirectKey);
} catch (err) {
  console.warn("No se pudo limpiar redirect state:", err);
}
