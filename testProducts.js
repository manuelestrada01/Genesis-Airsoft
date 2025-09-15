// testProducts.js
//node testProducts.js
import { Product } from "./src/models/product.js";
import { createProduct, getProducts } from "./src/controllers/productController.js";

// ⚠️ IMPORTANTE: Asegurate que en firebase.js exportes `db`
import "./src/firebase.js";

const test = async () => {
  // Crear un producto de prueba
  const newProduct = new Product({
    name: "Arcturus Vanguard 4.3",
    price: 450000,
    category: "Marcadoras GBB",
    description: "Pistola GBB.",
    image: "https://www.arcturustactical.com/cdn/shop/files/AT-GHC-V4-BT-10.jpg?v=1744142171&width=720"
  });

  console.log("Creando producto...");
  const id = await createProduct(newProduct);
  console.log(`✅ Producto creado con ID: ${id}`);

  // Obtener todos los productos
  console.log("Listando productos...");
  const products = await getProducts();
  console.log(products);
};

test()
  .then(() => process.exit())
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
