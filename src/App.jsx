import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public components
import ProductDetail from "./components/ItemDetailContainer";
import NavBarTop from "./components/NavBarTop";
import NavBarBottom from "./components/NavBarBottom";
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

// Admin components
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminProducts from "./components/admin/AdminProducts";
import AdminAddProduct from "./components/admin/AdminAddProduct";
import AdminEditProduct from "./components/admin/AdminEditProduct";
import AdminRoute from "./components/admin/AdminRoute"; // 🔥 PROTECCIÓN ADMIN

import "./App.css";

const Home = () => (
  <div className="app-container">
    <div style={{ marginTop: "-100px", display: "flex", justifyContent: "center" }}>
      <Carousel />
    </div>

    <div style={{ margin: "10px 20px" }}>
      <ItemListContainer />
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
    <ScrollToTop />
      {/* RUTAS ADMIN – OCULTAN NAVBAR Y FOOTER */}
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
      </Routes>

      {/* RUTAS PÚBLICAS */}
      <NavBarTop />
      <NavBarBottom />

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
        </Routes>
      </div>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
