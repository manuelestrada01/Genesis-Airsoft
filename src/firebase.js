// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";



const firebaseConfig = {
  apiKey: "AIzaSyCRtk56hQ202M3FfXsXvzOT4PsQ7vF5F_I",
  authDomain: "genesis-airsoft.firebaseapp.com",
  projectId: "genesis-airsoft",
  storageBucket: "genesis-airsoft.appspot.com", // 👈 corregido
  messagingSenderId: "352857393989",
  appId: "1:352857393989:web:6ac9ef76dd80c41d280c2c"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); // 👈 Aquí añadimos Auth