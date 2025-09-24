import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProductDetail from "./components/ItemDetailContainer"; 
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
    {/* Reducimos el marginTop */}
    <div style={{ marginTop: "-100px", display: "flex", justifyContent: "center" }}>
      <Carousel />
    </div>

    <ItemListContainer greeting="¡Bienvenido a Genesis Airsoft!" />
    <div style={{ margin: "10px 20px" }}>
      <ProductList />
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
          <Route path="/category/:categoryId" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
        </Routes>
      </div>

      <Footer />
    </BrowserRouter>
  );
}



export default App;
