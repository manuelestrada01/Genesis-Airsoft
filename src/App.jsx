import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

// Alquileres (public)
import AlquileresPage from "./components/alquileres/AlquileresPage";
import PartidaDetail from "./components/alquileres/PartidaDetail";
import RentalReservationFlow from "./components/alquileres/RentalReservationFlow";
import ReservationStatus from "./components/alquileres/ReservationStatus";

// Admin components
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminProducts from "./components/admin/AdminProducts";
import AdminAddProduct from "./components/admin/AdminAddProduct";
import AdminEditProduct from "./components/admin/AdminEditProduct";
import AdminRoute from "./components/admin/AdminRoute";
import AdminOrders from "./components/admin/AdminOrders";
import AdminOrderDetail from "./components/admin/AdminOrderDetail";
import AdminPartidas from "./components/admin/AdminPartidas";
import AdminAddPartida from "./components/admin/AdminAddPartida";
import AdminEditPartida from "./components/admin/AdminEditPartida";
import AdminRentalReservations from "./components/admin/AdminRentalReservations";
import AdminRentalReservationDetail from "./components/admin/AdminRentalReservationDetail";
import AdminAddReservation from "./components/admin/AdminAddReservation";
import AdminRentalConfig from "./components/admin/AdminRentalConfig";

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

        {/* Rental admin routes */}
        <Route
          path="/admin/partidas"
          element={
            <AdminRoute>
              <AdminPartidas />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partidas/add"
          element={
            <AdminRoute>
              <AdminAddPartida />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partidas/edit/:id"
          element={
            <AdminRoute>
              <AdminEditPartida />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/alquileres"
          element={
            <AdminRoute>
              <AdminRentalReservations />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/alquileres/nueva"
          element={
            <AdminRoute>
              <AdminAddReservation />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/alquileres/:id"
          element={
            <AdminRoute>
              <AdminRentalReservationDetail />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/rental-config"
          element={
            <AdminRoute>
              <AdminRentalConfig />
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

          {/* Alquileres */}
          <Route path="/alquileres" element={<AlquileresPage />} />
          <Route path="/alquileres/partida/:id" element={<PartidaDetail />} />
          <Route path="/alquileres/reservar/:partidaId" element={<RentalReservationFlow />} />
          <Route path="/alquileres/reserva/:id" element={<ReservationStatus />} />
        </Routes>
      </div>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
