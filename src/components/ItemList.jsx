import React from "react";
import ProductCard from "./ProductCard";
import "./ItemListContainer.css";

const ItemList = ({ products }) => {
  if (!products || products.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          width: "100%",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#777",
            fontSize: "18px",
            fontWeight: 500,
          }}
        >
          No hay productos en esta categoría.
        </p>
      </div>
    );
  }

  return (
    <div className="product-list">
      {products.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
};

export default ItemList;
