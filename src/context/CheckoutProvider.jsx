import { useState, useEffect, useContext } from "react";
import { CheckoutContext } from "./CheckoutContext";
import AuthContext from "./AuthContext";

function CheckoutProvider({ children }) {
  const { user } = useContext(AuthContext);

  const [buyer, setBuyer] = useState({
    name: "",
    email: "",
    phone: "",
    dni: "",
    street: "",
    number: "",
    city: "",
    province: "",
    zip: "",
    notes: "",
    method: "delivery",
  });

  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleBuyerChange = (e) => {
    const { name, value } = e.target;
    setBuyer((prev) => ({ ...prev, [name]: value }));
  };

  const resetCheckout = () => {
    setBuyer({
      name: "",
      email: "",
      phone: "",
      dni: "",
      street: "",
      number: "",
      city: "",
      province: "",
      zip: "",
      notes: "",
      method: "delivery",
    });
    setOrderId(null);
    setError(null);
  };

  useEffect(() => {
    if (!user) return;

    setBuyer((prev) => ({
      ...prev,
      name: user.displayName || prev.name,
      email: user.email || prev.email,
    }));
  }, [user]);

  return (
    <CheckoutContext.Provider
      value={{
        buyer,
        handleBuyerChange,
        orderId,
        loading,
        error,
        resetCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export default CheckoutProvider;
