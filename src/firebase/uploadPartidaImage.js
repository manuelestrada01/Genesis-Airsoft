import { storage } from "./config";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export async function uploadPartidaImage(file, partidaId) {
  const fileName = `${Date.now()}_${file.name}`;
  const imagePath = `partidas/${partidaId}/${fileName}`;
  const storageRef = ref(storage, imagePath);

  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);

  return { imageUrl, imagePath };
}

export async function deletePartidaImage(imagePath) {
  const imageRef = ref(storage, imagePath);
  await deleteObject(imageRef);
}
