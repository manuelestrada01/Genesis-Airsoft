// src/firebase/uploadProductImage.js
import { storage } from "./config";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// ======================================================
// 🔥 SUBIR UNA SOLA IMAGEN
// ======================================================
export async function uploadProductImage(file, productId) {
  const fileName = `${Date.now()}_${file.name}`;
  const imagePath = `products/${productId}/${fileName}`;
  const storageRef = ref(storage, imagePath);

  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);

  return { imageUrl, imagePath };
}

// ======================================================
// 🔥 SUBIR MÚLTIPLES IMÁGENES
// ======================================================
export async function uploadMultipleImages(files, productId) {
  const uploads = [];

  for (const file of files) {
    const upload = await uploadProductImage(file, productId);
    uploads.push(upload); // { imageUrl, imagePath }
  }

  return uploads; // array de objetos
}

// ======================================================
// 🔥 BORRAR IMAGEN
// ======================================================
export async function deleteProductImage(imagePath) {
  const imageRef = ref(storage, imagePath);
  await deleteObject(imageRef);
}
