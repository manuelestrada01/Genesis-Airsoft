// src/controllers/productController.js
import { db } from "../firebase.js";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

// Colección de productos
const productsCollection = collection(db, "products");

// Crear producto
export const createProduct = async (product) => {
  const docRef = await addDoc(productsCollection, { ...product });
  return docRef.id;
};

// Obtener todos los productos
export const getProducts = async () => {
  const snapshot = await getDocs(productsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Obtener producto por ID
export const getProductById = async (id) => {
  const docRef = doc(db, "articulos", id);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

// Actualizar producto
export const updateProduct = async (id, updatedFields) => {
  const docRef = doc(db, "articulos", id);
  await updateDoc(docRef, updatedFields);
};

// Eliminar producto
export const deleteProduct = async (id) => {
  const docRef = doc(db, "articulos", id);
  await deleteDoc(docRef);
};
