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

    // Campos adicionales usados en Checkout.jsx
    street: "",
    number: "",
    city: "",
    province: "",
    zip: "",
    notes: "",
    method: "delivery",
  });

  const [orderId, setOrderId] = useState(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleBuyerChange = (e) => {
    const { name, value } = e.target;
    setBuyer((prev) => ({ ...prev, [name]: value }));
  };

  const resetBuyer = () => {
    setBuyer({
      name: "",
      email: "",
      phone: "",
      street: "",
      number: "",
      city: "",
      province: "",
      zip: "",
      notes: "",
      method: "delivery",
    });
  };

  useEffect(() => {
    if (!user) {
      resetBuyer();
      return;
    }

    setBuyer((prev) => ({
      ...prev,
      name: user.displayName || prev.name || "",
      email: user.email || prev.email || "",
    }));
  }, [user]);

  const completeCheckout = async () => {
    if (loading) {
      setError("⏳ Waiting for user authentication...");
      return;
    }

    if (!user || !user.uid) {
      setError("❌ You must be logged in to complete the purchase.");
      return;
    }

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

        buyer: {
          name: buyer.name,
          email: buyer.email,
          phone: buyer.phone,
          street: buyer.street,
          number: buyer.number,
          city: buyer.city,
          province: buyer.province,
          zip: buyer.zip,
          notes: buyer.notes,
          method: buyer.method,
        },

        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),

        total: totalPrice,

        createdAt: serverTimestamp(),
        dispatched: false, // 🔥 NUEVO: estado envío
        status: "pending",
      };

      const docRef = await addDoc(ordersRef, orderData);

      setOrderId(docRef.id);
      setSuccess("✅ Order created successfully!");

      await clearCart();

      return docRef.id;
    } catch (err) {
      console.error("❌ Error creating order:", err);
      setError("❌ An error occurred while processing your order.");
    } finally {
      setLoadingCheckout(false);
    }
  };

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
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export default CheckoutProvider;
