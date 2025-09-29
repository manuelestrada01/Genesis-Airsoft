import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCRtk56hQ202M3FfXsXvzOT4PsQ7vF5F_I",
  authDomain: "genesis-airsoft.firebaseapp.com",
  projectId: "genesis-airsoft",
  storageBucket: "genesis-airsoft.appspot.com", // 👈 corregido
  messagingSenderId: "352857393989",
  appId: "1:352857393989:web:6ac9ef76dd80c41d280c2c"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);