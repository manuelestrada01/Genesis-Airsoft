import React, { useRef } from "react";
import ProductCard from "./ProductCard";
import "./ItemListContainer.css";
import { useScrollReveal } from "../hooks/useScrollReveal";

const ItemList = ({ products }) => {
  const listRef = useRef(null);
  useScrollReveal(listRef, ".product-card");

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
        <p style={{ color: "var(--text-muted)", fontSize: "16px", fontWeight: 500 }}>
          No hay productos en esta categoría.
        </p>
      </div>
    );
  }

  return (
    <div className="product-list" ref={listRef}>
      {products.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
};

export default ItemList;
