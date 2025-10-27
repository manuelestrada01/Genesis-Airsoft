import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import AuthProvider from "./context/AuthProvider.jsx";
import CartProvider from "./context/CartProvider.jsx";
import CheckoutProvider from "./context/CheckoutProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <CheckoutProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </CheckoutProvider>
    </AuthProvider>
  </StrictMode>
);
