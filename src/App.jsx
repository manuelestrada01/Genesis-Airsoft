import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import "./App.css";
import CheckoutSuccess from "./components/CheckoutSuccess";
import CheckoutFailure from "./components/CheckoutFailure";
import CheckoutPending from "./components/CheckoutPending";

const Home = () => (
  <div className="app-container">
    {/* Reducimos el marginTop */}
    <div style={{ marginTop: "-100px", display: "flex", justifyContent: "center" }}>
      <Carousel />
    </div>

    <Greetting Greetting="¡Bienvenido a Genesis Airsoft!" />
    <div style={{ margin: "10px 20px" }}>
      <ItemListContainer />
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <NavBarTop />
      <NavBarBottom />

      {/* 👇 Usamos clase global en lugar de marginTop suelto */}
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
