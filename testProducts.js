// testProducts.js
import { Product } from "./src/models/product.js";
import { createProduct, getProducts } from "./src/controllers/productController.js";

// ⚠️ IMPORTANTE: Asegurate que en firebase.js exportes `db`
import "./src/firebase.js";

const test = async () => {
  // Crear un producto de prueba
  const newProduct = new Product({
    name: "Réplica M4A1",
    price: 1500,
    category: "Airsoft",
    description: "Réplica eléctrica full metal con batería incluida.",
    image: "https://miurl.com/m4a1.jpg"
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
