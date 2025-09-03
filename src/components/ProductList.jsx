import React from "react";
import ProductCard from "./ProductCard";
import trinitymk3 from "../assets/Capturatrinity.png";
import ak74 from "../assets/ak74.png";
import atak from "../assets/atak.png";
import ar15 from "../assets/ar15.png";
import vanguard from "../assets/vanguard.png";
import "./ProductList.css";

const products = [
  { id: 1, name: "Arcturus Trinity MK3", price: "$1500", image: trinitymk3, category: "Rifle Eléctrico" },
  { id: 2, name: "AK74", price: "$1200", image: ak74, category: "Rifle Eléctrico" },
  { id: 3, name: "ATAK", price: "$900", image: atak, category: "Pistola GBB" },
  { id: 4, name: "AR15", price: "$1100", image: ar15, category: "Rifle Eléctrico" },
  { id: 5, name: "Vanguard", price: "$1300", image: vanguard, category: "Rifle Eléctrico" },
  // podés seguir agregando más...
];

const ProductList = () => {
  return (
    <div className="product-list">
      {products.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
};

export default ProductList;
