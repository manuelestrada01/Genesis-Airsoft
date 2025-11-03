import { useState, useEffect, useContext } from "react";
import { CartContext } from "./CartContext";
import AuthContext from "./AuthContext";
import { db } from "../firebase/config";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { CheckoutContext } from "./CheckoutContext";

function CartProvider({ children }) {
  const { user, loadingUser } = useContext(AuthContext);
  const checkoutContext = useContext(CheckoutContext);
  const resetCheckout = checkoutContext?.resetCheckout;

  const [cart, setCart] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartLoaded, setCartLoaded] = useState(false); // 👈 Nuevo estado

  // Cargar carrito desde Firestore solo cuando el usuario esté disponible
  useEffect(() => {
    const fetchCart = async () => {
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
        setCartLoaded(true); // 👈 marcamos que ya se cargó
      } catch (error) {
        console.error("❌ Error al cargar carrito:", error);
      } finally {
        setLoadingCart(false);
      }
    };

    if (!loadingUser) fetchCart();
  }, [user, loadingUser]);

  // Guardar carrito en Firestore solo después de que se cargó desde Firestore
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
  }, [cart, user, cartLoaded]); // 👈 cambiamos dependencia a cartLoaded

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

    if (resetCheckout) resetCheckout();
  };

  // Eliminar item
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

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
        loadingCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export default CartProvider;
