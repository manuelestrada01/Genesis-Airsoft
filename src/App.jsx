import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";

// Public components
import ProductDetail from "./components/ItemDetailContainer";
import NavBarDesktop from "./components/NavBarDesktop";
import MobileNavBar from "./components/MobileNavBar";
import Carousel from "./components/Carousel";
import Greetting from "./components/greeting";
import ItemListContainer from "./components/ItemListContainer";
import Footer from "./components/Footer";
import Auth from "./components/Auth";
import CartContainer from "./components/CartContainer";
import Checkout from "./components/Checkout";
import Profile from "./components/Profile";
import ScrollToTop from "./components/ScrollToTop";
import CheckoutSuccess from "./components/CheckoutSuccess";
import CheckoutFailure from "./components/CheckoutFailure";
import CheckoutPending from "./components/CheckoutPending";
import OrderDetail from "./components/OrderDetail";
import Contact from "./components/Contact";
import AboutGenesis from "./components/AboutGenesis";
import AlquileresConstruccion from "./components/AlquileresConstruccion";

// Admin components
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminProducts from "./components/admin/AdminProducts";
import AdminAddProduct from "./components/admin/AdminAddProduct";
import AdminEditProduct from "./components/admin/AdminEditProduct";
import AdminRoute from "./components/admin/AdminRoute";
import AdminOrders from "./components/admin/AdminOrders";
import AdminOrderDetail from "./components/admin/AdminOrderDetail";

// Hooks
import useIsMobile from "./hooks/useIsMobile";

import "./App.css";

// HOME
const Home = () => (
  <div className="app-container">
    <div style={{ marginTop: "-100px", display: "flex", justifyContent: "center" }}>
      <Carousel />
    </div>

    <div style={{ margin: "10px 20px" }}>
      <ItemListContainer />
    </div>

    {/* 🔥 Nueva sección institucional */}
    <AboutGenesis />
  </div>
);

function App() {
  const isMobile = useIsMobile(); // 👈 detección mobile

  return (
    <BrowserRouter>
      <ScrollToTop />

      {/* ================= ADMIN ROUTES ================= */}
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products/add"
          element={
            <AdminRoute>
              <AdminAddProduct />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products/edit/:id"
          element={
            <AdminRoute>
              <AdminEditProduct />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders/:id"
          element={
            <AdminRoute>
              <AdminOrderDetail />
            </AdminRoute>
          }
        />
      </Routes>

      {/* ================= NAVBARS ================= */}
      {isMobile ? (
        <MobileNavBar />
      ) : (
        <NavBarDesktop />
      )}

      {/* ================= PUBLIC ROUTES ================= */}
      <div className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/category/:categoryId" element={<ItemListContainer />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartContainer />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/checkout-failure" element={<CheckoutFailure />} />
          <Route path="/checkout-pending" element={<CheckoutPending />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/search" element={<ItemListContainer />} />
          <Route path="/alquileres/:zona" element={<AlquileresConstruccion />} />
        </Routes>
      </div>

      <Footer />

      {/* WhatsApp flotante */}
      <a
        href="https://wa.me/541130441967"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: "#25D366",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "28px",
          boxShadow: "0 4px 16px rgba(37,211,102,0.4)",
          zIndex: 9999,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,211,102,0.6)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,211,102,0.4)";
        }}
      >
        <FaWhatsapp />
      </a>
    </BrowserRouter>
  );
}

export default App;
