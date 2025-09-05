import React from "react";
import ProductCard from "./ProductCard";
import trinitymk3 from "../assets/Capturatrinity.png";
import ak74C from "../assets/ak74C.png";
import atak from "../assets/atak.png";
import ar15 from "../assets/ar15.png";
import scar from "../assets/scar.jpg";
import "./ProductList.css";

const products = [
  { id: 1, name: "Arcturus Trinity MK3", price: "$1100000", image: trinitymk3, category: "Rifle Eléctrico" },
  { id: 2, name: "AK74C", price: "$770000", image: ak74C, category: "Rifle Eléctrico" },
  { id: 3, name: "ATAK", price: "$800000", image: atak, category: "Pistola GBB" },
  { id: 4, name: "AR15", price: "$540000", image: ar15, category: "Rifle Eléctrico" },
  { id: 5, name: "scar", price: "$1300", image: scar, category: "Rifle Eléctrico" },
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
