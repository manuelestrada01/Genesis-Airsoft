import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import NavBarTop from "./components/NavBarTop";
import NavBarBottom from "./components/NavBarBottom";
import Carousel from "./components/Carousel";
import ItemListContainer from "./components/greeting"; 
import ProductList from "./components/ItemListContainer";
import Footer from "./components/Footer";
import Auth from "./components/Auth";
import "./App.css";

const Home = () => (
  <div className="app-container">
    <div style={{ marginTop: "170px", display: "flex", justifyContent: "center" }}>
      <Carousel />
    </div>
    <ItemListContainer greeting="¡Bienvenido a Genesis Airsoft!" />
    <div style={{ margin: "40px 20px" }}>
      <ProductList />
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <NavBarTop />
      <NavBarBottom />

      <div style={{ minHeight: "80vh" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />

          {/* 👇 Nueva ruta para categorías */}
          <Route path="/category/:categoryId" element={<ProductList />} />
        </Routes>
      </div>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
