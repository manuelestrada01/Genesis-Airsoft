import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Use application default credentials (Firebase CLI login)
const app = getApps().length === 0
  ? initializeApp({ projectId: "genesis-airsoft" })
  : getApps()[0];

const db = getFirestore(app);

const newCategories = [
  { id: "repuestos", name: "Repuestos" },
  { id: "baterias", name: "Baterias" },
];

for (const cat of newCategories) {
  const ref = db.collection("categories").doc(cat.id);
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`Already exists: ${cat.name}`);
  } else {
    await ref.set({ name: cat.name });
    console.log(`Created: ${cat.name}`);
  }
}

console.log("Done.");
process.exit(0);
