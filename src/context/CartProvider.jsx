// src/context/CartProvider.jsx
import { useState, useEffect, useContext } from "react";
import { CartContext } from "./CartContext";
import AuthContext from "./AuthContext";
import { db } from "../firebase/config";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { CheckoutContext } from "./CheckoutContext";

function CartProvider({ children }) {
  const { user } = useContext(AuthContext);
  let checkoutContext;
  try {
    checkoutContext = useContext(CheckoutContext);
  } catch (err) {
    // Si CheckoutProvider no está montado, evitamos crash
    checkoutContext = null;
  }

  const resetCheckout = checkoutContext?.resetCheckout;

  const [cart, setCart] = useState([]);

  // Cargar carrito desde Firestore
  useEffect(() => {
    const fetchCart = async () => {
      if (user) {
        try {
          const cartRef = doc(db, "carts", user.uid);
          const cartSnap = await getDoc(cartRef);
          if (cartSnap.exists()) setCart(cartSnap.data().items || []);
          else setCart([]);
        } catch (error) {
          console.error("❌ Error al cargar carrito:", error);
        }
      } else setCart([]);
    };
    fetchCart();
  }, [user]);

  // Guardar carrito en Firestore
  useEffect(() => {
    const saveCart = async () => {
      if (user) {
        try {
          const cartRef = doc(db, "carts", user.uid);
          await setDoc(cartRef, { items: cart }, { merge: true });
        } catch (error) {
          console.error("❌ Error al guardar carrito:", error);
        }
      }
    };
    saveCart();
  }, [cart, user]);

  // Agregar item al carrito
  const addToCart = (item, quantity) => {
    setCart((prev) => {
      const existing = prev.find((prod) => prod.id === item.id);
      if (existing) {
        return prev.map((prod) =>
          prod.id === item.id
            ? { ...prod, quantity: prod.quantity + quantity }
            : prod
        );
      } else {
        return [...prev, { ...item, quantity }];
      }
    });

    // 🔹 Reseteamos el checkout solo si existe
    if (resetCheckout) resetCheckout();
  };

  // Eliminar item
  const removeFromCart = (id) => setCart((prev) => prev.filter((item) => item.id !== id));

  // Vaciar carrito
  const clearCart = async () => {
    setCart([]);
    if (user) {
      try {
        const cartRef = doc(db, "carts", user.uid);
        await updateDoc(cartRef, { items: [] });
      } catch (error) {
        console.error("❌ Error al limpiar carrito:", error);
      }
    }
  };

  // Calcular total
  const getTotalPrice = () =>
    cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        totalPrice: getTotalPrice(),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export default CartProvider;
