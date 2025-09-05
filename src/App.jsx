import React from "react";
import NavBarTop from "./components/NavBarTop";
import NavBarBottom from "./components/NavBarBottom";
import Carousel from "./components/Carousel";
import ItemListContainer from "./components/ItemListContainer";
import ProductList from "./components/ProductList";
import Footer from "./components/Footer";
import "./App.css"; // 👈 acá pondremos estilos generales

function App() {
  return (
    <>
      <div className="app-container">
        <NavBarTop />
        <NavBarBottom />
        <div style={{ marginTop: "170px", display: "flex", justifyContent: "center" }}>
          <Carousel />
        </div>
        <ItemListContainer greeting="¡Bienvenido a Genesis Airsoft!" />
        <div style={{ margin: "40px 20px" }}>
          <ProductList />
        </div>
        
      </div>
     <Footer />
    </>
  );
}



export default App;
