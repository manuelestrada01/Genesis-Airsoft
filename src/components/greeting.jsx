// src/components/ItemListContainer.jsx
import './ItemListContainer.css';
import React from 'react';  

const ItemListContainer = ({ greeting }) => {
  return (
    <div className="item-list-container">
      <h2>{greeting}</h2>
    </div>
  );
};

export default ItemListContainer;
