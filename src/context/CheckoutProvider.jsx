import { useState, useContext, useEffect } from "react";
import { CheckoutContext } from "./CheckoutContext";
import { CartContext } from "./CartContext";
import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import AuthContext from "./AuthContext";

function CheckoutProvider({ children }) {
  const { user, loading } = useContext(AuthContext);
  const cartContext = useContext(CartContext);

  const cart = cartContext?.cart || [];
  const clearCart = cartContext?.clearCart || (() => {});
  const totalPrice = cartContext?.totalPrice || 0;

  const [buyer, setBuyer] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [orderId, setOrderId] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  /* ✅ Actualiza SOLO el campo editado */
  const handleBuyerChange = (e) => {
    const { name, value } = e.target;
    setBuyer((prev) => ({ ...prev, [name]: value }));
  };

  /* ✅ Limpia buyer COMPLETO cuando cambia el usuario */
  const resetBuyer = () => {
    setBuyer({
      name: "",
      email: "",
      phone: "",
    });
  };

  /* ✅ EFECTO CRÍTICO:
       - Si NO hay usuario → limpiar buyer (no debe ver datos previos)
       - Si hay usuario → completar del auth
  */
  useEffect(() => {
    if (!user) {
      resetBuyer(); // ✅ limpia datos cuando se desloguea
      return;
    }

    // ✅ Autocomplete si el usuario está logueado
    setBuyer((prev) => ({
      ...prev,
      name: user.displayName || prev.name || "",
      email: user.email || prev.email || "",
    }));
  }, [user]);

  /* ✅ Crear orden */
  const completeCheckout = async () => {
    console.log("🛒 Current cart:", cart);

    // Si Firebase Auth sigue cargando
    if (loading) {
      setError("⏳ Waiting for user authentication...");
      return;
    }

    // Si NO hay usuario
    if (!user || !user.uid) {
      setError("❌ You must be logged in to complete the purchase.");
      return;
    }

    // Si el carrito está vacío
    if (!cart || cart.length === 0) {
      setError("❌ Your cart is empty. Please add some products first.");
      return;
    }

    setLoadingCheckout(true);
    setError(null);
    setSuccess(null);

    try {
      const ordersRef = collection(db, "orders");

      const orderData = {
        userId: user.uid,
        buyer,
        items: cart,
        total: totalPrice,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(ordersRef, orderData);

      setOrderId(docRef.id);
      setSuccess("✅ Order created successfully!");
      console.log("🟢 Order created with ID:", docRef.id, "for user:", user.uid);

      await clearCart();

      return docRef.id; // ✅ DEVUELVE el orderId al checkout
    } catch (err) {
      console.error("❌ Error creating order:", err);
      setError("❌ An error occurred while processing your order.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  /* ✅ Reset general del checkout */
  const resetCheckout = () => {
    resetBuyer();
    setOrderId(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <CheckoutContext.Provider
      value={{
        buyer,
        handleBuyerChange,
        orderId,
        loading: loadingCheckout,
        error,
        success,
        completeCheckout,
        resetCheckout,
        resetBuyer, // ✅ lo exporto por si querés usarlo desde Auth
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export default CheckoutProvider;
