import { useState, useContext } from "react";
import { CheckoutContext } from "./CheckoutContext";
import { CartContext } from "./CartContext";
import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import AuthContext from "./AuthContext";

function CheckoutProvider({ children }) {
  const { user, loading } = useContext(AuthContext); // ✅ ahora usamos loading también
  const cartContext = useContext(CartContext);

  const cart = cartContext?.cart || [];
  const clearCart = cartContext?.clearCart || (() => {});
  const totalPrice = cartContext?.totalPrice || 0;

  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [orderId, setOrderId] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleBuyerChange = (e) => {
    const { name, value } = e.target;
    setBuyer((prev) => ({ ...prev, [name]: value }));
  };

  const completeCheckout = async () => {
    console.log("🛒 Current cart:", cart);

    // Esperar a que se cargue el estado del usuario
    if (loading) {
      setError("⏳ Waiting for user authentication...");
      return;
    }

    // Asegurarse de que haya usuario logueado
    if (!user || !user.uid) {
      setError("❌ You must be logged in to complete the purchase.");
      return;
    }

    // Validar que el carrito no esté vacío
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
        userId: user.uid, // ✅ ahora garantizado que llega correctamente
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
    } catch (err) {
      console.error("❌ Error creating order:", err);
      setError("❌ An error occurred while processing your order.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const resetCheckout = () => {
    setBuyer({ name: "", email: "", phone: "" });
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
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export default CheckoutProvider;
