const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "ueHvElYgWAbO6yBYOYny8C2G4al2"; // ← reemplazar con tu UID real

admin
  .auth()
  .setCustomUserClaims(uid, { role: "admin" })
  .then(() => {
    console.log("✔ Usuario marcado como ADMIN:", uid);
  })
  .catch((err) => {
    console.error("❌ Error asignando admin:", err);
  });
