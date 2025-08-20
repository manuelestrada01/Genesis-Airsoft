

import React from 'react';
import NavBar from './components/NavBar';
import ItemListContainer from './components/ItemListContainer';

function App() {
  return (
    <div style={{ marginTop: "100px" }}>
      <NavBar />
      <ItemListContainer greeting="¡Bienvenido a Genesis Airsoft!" />
    </div>
  );
}

export default App;
