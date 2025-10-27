import { useState, useContext } from "react";
import { CheckoutContext } from "./CheckoutContext";
import { CartContext } from "./CartContext";
import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import AuthContext from "./AuthContext";

function CheckoutProvider({ children }) {
  const { user } = useContext(AuthContext);
  const cartContext = useContext(CartContext);

  const cart = cartContext?.cart || [];
  const clearCart = cartContext?.clearCart || (() => {});
  const totalPrice = cartContext?.totalPrice || 0;

  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleBuyerChange = (e) => {
    const { name, value } = e.target;
    setBuyer((prev) => ({ ...prev, [name]: value }));
  };

  const completeCheckout = async () => {
    console.log("🛒 Carrito actual:", cart); // para verificar

    if (!user) {
      setError("❌ Debes iniciar sesión para completar la compra.");
      return;
    }

    if (!cart || cart.length === 0) {
      setError("❌ El carrito está vacío. Agrega productos antes de comprar.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const ordersRef = collection(db, "orders");
      const docRef = await addDoc(ordersRef, {
        userId: user.uid,
        items: cart,
        total: totalPrice,
        buyer,
        createdAt: serverTimestamp(),
      });

      setOrderId(docRef.id);
      setSuccess("✅ Pedido realizado correctamente.");
      console.log("🟢 Pedido creado con ID:", docRef.id);

      await clearCart();

    } catch (err) {
      console.error("❌ Error al crear pedido:", err);
      setError("❌ Ocurrió un error al procesar tu pedido.");
    } finally {
      setLoading(false);
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
        loading,
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
