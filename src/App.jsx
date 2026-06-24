import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

// Alquileres (public)
import AlquileresPage from "./components/alquileres/AlquileresPage";
import PartidaDetail from "./components/alquileres/PartidaDetail";
import RentalReservationFlow from "./components/alquileres/RentalReservationFlow";
import ReservationStatus from "./components/alquileres/ReservationStatus";

// Servicio Técnico (public)
import ServicioPage, { SERVICIO_COMING_SOON } from "./components/servicio/ServicioPage";
import ServicioTurnoFlow from "./components/servicio/ServicioTurnoFlow";
import ServicioTurnoStatus from "./components/servicio/ServicioTurnoStatus";
import ServicioRedeem from "./components/servicio/ServicioRedeem";

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
import AdminShippingLabel from "./components/admin/AdminShippingLabel";

// Servicio Técnico (admin)
import AdminServicioTurnos from "./components/admin/AdminServicioTurnos";
import AdminServicioTurnoDetail from "./components/admin/AdminServicioTurnoDetail";
import AdminServicioConfig from "./components/admin/AdminServicioConfig";
import AdminServicioCalendar from "./components/admin/AdminServicioCalendar";

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
        <Route
          path="/admin/etiqueta"
          element={
            <AdminRoute>
              <AdminShippingLabel />
            </AdminRoute>
          }
        />

        {/* Servicio Técnico admin routes */}
        <Route
          path="/admin/servicio"
          element={
            <AdminRoute>
              <AdminServicioTurnos />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/servicio/config"
          element={
            <AdminRoute>
              <AdminServicioConfig />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/servicio/calendario"
          element={
            <AdminRoute>
              <AdminServicioCalendar />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/servicio/:id"
          element={
            <AdminRoute>
              <AdminServicioTurnoDetail />
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

          {/* Servicio Técnico */}
          <Route path="/servicio" element={<ServicioPage />} />
          <Route path="/servicio/turno/:type" element={SERVICIO_COMING_SOON ? <Navigate to="/servicio" replace /> : <ServicioTurnoFlow />} />
          <Route path="/servicio/turno-status/:id" element={<ServicioTurnoStatus />} />
          <Route path="/servicio/canjear" element={SERVICIO_COMING_SOON ? <Navigate to="/servicio" replace /> : <ServicioRedeem />} />
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
