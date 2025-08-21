
import React from 'react';
import NavBar from './components/NavBarTop';
import NavBarBottom from './components/NavBarBottom';  // 👈 Importa la nueva navbar
import ItemListContainer from './components/ItemListContainer';

function App() {
  return (
    <div>
      <NavBar />
      <NavBarBottom />
      <ItemListContainer greeting="¡Bienvenido a Genesis Airsoft!" />
    </div>
  );
}


export default App;
