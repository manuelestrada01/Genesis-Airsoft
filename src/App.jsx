import React from "react";
import NavBarTop from "./components/NavBarTop";
import NavBarBottom from "./components/NavBarBottom";
import Carousel from "./components/Carousel";
import ItemListContainer from "./components/ItemListContainer";
import ProductList from "./components/ProductList"; // nuevo import

function App() {
  return (
    <div>
      <NavBarTop />
      <NavBarBottom />

      {/* Carrusel debajo de la navbar-bottom */}
      <div style={{ marginTop: "170px" }}>
        <Carousel />
      </div>

      {/* Mensaje de bienvenida */}
      <ItemListContainer greeting="¡Bienvenido a Genesis Airsoft!" />

      {/* Cards de productos debajo */}
      <div style={{ margin: "40px 20px" }}>
        <ProductList />
      </div>
    </div>
  );
}

export default App;
