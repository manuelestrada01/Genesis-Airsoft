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
import OrderDetail from "./components/OrderDetail";
import Contact from "./components/Contact";
import AboutGenesis from "./components/AboutGenesis";

// Admin components
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminProducts from "./components/admin/AdminProducts";
import AdminAddProduct from "./components/admin/AdminAddProduct";
import AdminEditProduct from "./components/admin/AdminEditProduct";
import AdminRoute from "./components/admin/AdminRoute"; 
import AdminOrders from "./components/admin/AdminOrders";
import AdminOrderDetail from "./components/admin/AdminOrderDetail";

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
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/contacto" element={<Contact />} />
        </Routes>
      </div>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
