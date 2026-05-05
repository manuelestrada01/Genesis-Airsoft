// src/context/CartProvider.jsx

import { useState, useEffect, useContext } from "react";
import { CartContext } from "./CartContext";
import AuthContext from "./AuthContext";
import { db, analytics } from "../firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { CheckoutContext } from "./CheckoutContext";
import { logEvent } from "firebase/analytics";

function CartProvider({ children }) {

  const { user, loadingUser } = useContext(AuthContext);
  const checkoutContext = useContext(CheckoutContext);
  const resetCheckout = checkoutContext?.resetCheckout;

  const [cart, setCart] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartLoaded, setCartLoaded] = useState(false);

  // ============================================================
  // 1) Cargar carrito desde Firestore (PERO NO EN checkout-success)
  // ============================================================
  useEffect(() => {
    const fetchCart = async () => {

      // ⛔ Solución al BUG: evitar cargar carrito en checkout-success
      if (window.location.pathname.includes("checkout-success")) {
        console.log("⛔ Evitando recargar carrito en checkout-success");
        setCart([]);
        setLoadingCart(false);
        return;
      }

      // Usuario no logueado → carrito vacío
      if (!user) {
        setCart([]);
        setCartLoaded(false);
        setLoadingCart(false);
        return;
      }

      try {
        const cartRef = doc(db, "carts", user.uid);
        const cartSnap = await getDoc(cartRef);

        if (cartSnap.exists()) {
          setCart(cartSnap.data().items || []);
        } else {
          setCart([]);
        }

        setCartLoaded(true);
      } catch (error) {
        console.error("❌ Error al cargar carrito:", error);
      } finally {
        setLoadingCart(false);
      }
    };

    if (!loadingUser) fetchCart();
  }, [user, loadingUser]);

  // ============================================================
  // 2) Guardar carrito en Firestore cuando se modifica
  // ============================================================
  useEffect(() => {
    const saveCart = async () => {
      if (user && cartLoaded) {
        try {
          const cartRef = doc(db, "carts", user.uid);
          await setDoc(cartRef, { items: cart }, { merge: true });
        } catch (error) {
          console.error("❌ Error al guardar carrito:", error);
        }
      }
    };

    saveCart();
  }, [cart, user, cartLoaded]);

  // ============================================================
  // 3) Agregar producto al carrito
  // ============================================================
  const addToCart = (item, quantity) => {
    const safeItem = {
      id: item.id || "",
      name: item.name || "",
      price: item.price || 0,
      image: item.image || "/placeholder.jpg",
      category: item.category || "",
      description: item.description || "",
      images: Array.isArray(item.images) ? item.images : [],
    };

    logEvent(analytics, "add_to_cart", {
      currency: "ARS",
      value: safeItem.price * quantity,
      items: [{ item_id: safeItem.id, item_name: safeItem.name, price: safeItem.price, quantity, item_category: safeItem.category || "" }],
    });

    setCart((prev) => {
      const existing = prev.find((prod) => prod.id === safeItem.id);

      if (existing) {
        return prev.map((prod) =>
          prod.id === safeItem.id
            ? { ...prod, quantity: prod.quantity + quantity }
            : prod
        );
      }

      return [...prev, { ...safeItem, quantity }];
    });

    if (resetCheckout) resetCheckout();
  };

  // ============================================================
  // 4) Actualizar cantidad
  // ============================================================
  const updateQuantity = (id, quantity) => {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  // ============================================================
  // 5) Eliminar item
  // ============================================================
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

  // ============================================================
  // 5) Vaciar carrito (FUNCIONA SIEMPRE)
  // ============================================================
  const clearCart = async () => {
    setCart([]);

    if (user) {
      try {
        const cartRef = doc(db, "carts", user.uid);
        await setDoc(cartRef, { items: [] }, { merge: true });
      } catch (error) {
        console.error("❌ Error al limpiar carrito:", error);
      }
    }
  };

  // ============================================================
  // 6) Total
  // ============================================================
  const getTotalPrice = () =>
    cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // ============================================================
  // 7) Evento opcional si querés sincronizar desde fuera
  // ============================================================
  useEffect(() => {
    const handler = () => setCart((prev) => [...prev]);
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  // ============================================================
  // 8) PROVIDER
  // ============================================================
  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalPrice: getTotalPrice(),
        loadingCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export default CartProvider;
