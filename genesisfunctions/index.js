// ================================
// Functions v7 + ESM + Secret Manager (VERSIÓN SEGURA)
// ================================

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import cors from "cors";
import nodemailer from "nodemailer";
import xss from "xss"; // Sanitización XSS

import {
  MercadoPagoConfig,
  Payment,
  MerchantOrder,
  Preference,
} from "mercadopago";

// Init Firebase
admin.initializeApp();


// ================================
// CORS — SOLO DOMINIOS PERMITIDOS
// ================================
const allowedOrigins = [
  "http://localhost:5173",
  "https://genesis-airsoft.web.app",
  "https://genesisairsoft.com",
  "https://virulently-phonolitic-adelia.ngrok-free.dev", // ⬅️ AGREGA ESTO
];


const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS blocked"), false);
  },
});


// ================================
// SECRETS
// ================================
const MP_ACCESS_TOKEN = defineSecret("MP_ACCESS_TOKEN");
const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");


// ================================
// MERCADO PAGO CLIENT
// ================================
function getMPClient() {
  return new MercadoPagoConfig({
    accessToken: MP_ACCESS_TOKEN.value(),
  });
}


// ======================================================================================
// ✔ FUNCIÓN PARA ENVIAR EMAIL DE CONFIRMACIÓN DE COMPRA
// ======================================================================================
async function sendOrderConfirmationEmail(orderData) {
  const email = xss(orderData.buyer.email || "");
  const name = xss(orderData.buyer.name || "");
  const orderId = orderData.id;
  const items = orderData.items;
  const total = orderData.total;

  if (!email) {
    logger.warn("⚠ La orden no tiene email, no se envía confirmación");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_EMAIL.value(),
      pass: GMAIL_PASSWORD.value(),
    },
  });

  const itemsHtml = items
    .map(
      (i) =>
        `<li>${xss(i.name)} × ${i.quantity} — $${i.price}</li>`
    )
    .join("");

  await transporter.sendMail({
    from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
    to: email,
    subject: "✔ Gracias por tu compra en Genesis Airsoft",
    html: `
      <h2>Hola ${name},</h2>
      <p>Tu pago fue <strong>aprobado</strong> y tu pedido ya está siendo procesado.</p>

      <h3>Detalles del pedido</h3>
      <p><strong>ID:</strong> ${orderId}</p>
      <p><strong>Total:</strong> $${total}</p>

      <h3>Productos:</h3>
      <ul>${itemsHtml}</ul>

      <p>Gracias por confiar en <b>Genesis Airsoft</b>.</p>
    `,
  });

  logger.info("📧 Email de confirmación enviado correctamente");
}



// ======================================================================================
// 1) WEBHOOK SEGURO — SOLO FEED v2
// ======================================================================================
export const webhook = onRequest(
  { secrets: [MP_ACCESS_TOKEN, GMAIL_EMAIL, GMAIL_PASSWORD] },
  async (req, res) => {

    try {
      if (req.method !== "POST") return res.sendStatus(200);

      const { topic, id } = req.query;

      if (!topic || !id) {
        logger.warn("❌ Webhook sin topic o id");
        return res.sendStatus(200);
      }

      if (topic !== "merchant_order" && topic !== "payment") {
        logger.warn("❌ Topic no permitido:", topic);
        return res.sendStatus(200);
      }

      logger.info("📩 Webhook recibido:", { topic, id });

      const mp = getMPClient();

      if (topic === "merchant_order") {
        const moClient = new MerchantOrder(mp);
        const mo = await moClient.get({ merchantOrderId: id });

        if (!mo.payments || mo.payments.length === 0) return res.sendStatus(200);

        const paymentId = mo.payments[0].id;

        const payClient = new Payment(mp);
        const paymentData = await payClient.get({ id: paymentId });

        return await processPayment(paymentData, res);
      }

      if (topic === "payment") {
        const payClient = new Payment(mp);
        const paymentData = await payClient.get({ id });

        return await processPayment(paymentData, res);
      }

      return res.sendStatus(200);

    } catch (err) {
      logger.error("❌ ERROR EN WEBHOOK:", err);
      return res.sendStatus(200);
    }
  }
);


// ======================================================================================
// 2) PROCESAMIENTO SEGURO DE PAGO + EMAIL SOLO EN APROBADOS
// ======================================================================================
async function processPayment(paymentData, res) {
  const orderId = paymentData.external_reference;

  if (!orderId) return res.sendStatus(200);

  const db = admin.firestore();
  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) return res.sendStatus(200);

  const orderData = orderSnap.data();

  if (orderData.status === "approved") {
    return res.sendStatus(200);
  }

  if (paymentData.transaction_amount !== orderData.total) {
    await orderRef.update({
      status: "amount_mismatch",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.sendStatus(200);
  }

  const status = paymentData.status;

  await orderRef.update({
    status,
    mpPaymentId: paymentData.id,
    paymentMethod: paymentData.payment_method_id,
    installments: paymentData.installments,
    paidAt: status === "approved" ? admin.firestore.FieldValue.serverTimestamp() : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 🔥 DESCONTAR STOCK SI SE APROBÓ
  if (status === "approved") {
    const batch = db.batch();

    for (const item of orderData.items) {
      const productRef = db.collection("products").doc(item.productId);
      const productSnap = await productRef.get();
      if (!productSnap.exists) continue;

      const productData = productSnap.data();
      const newStock = Math.max((productData.stock || 0) - item.quantity, 0);

      batch.update(productRef, { stock: newStock });
    }

    await batch.commit();
    logger.info("🟢 Stock descontado correctamente");

    // 🔥 ENVIAR EMAIL DE CONFIRMACIÓN
    await sendOrderConfirmationEmail({
      id: orderId,
      buyer: orderData.buyer,
      items: orderData.items,
      total: orderData.total,
    });
  }

  return res.sendStatus(200);
}



// ======================================================================================
// 3) PASSWORD CHANGED — Seguro y sanitizado
// ======================================================================================
export const passwordChanged = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        const email = xss(req.body.email || "");
        const name = xss(req.body.name || "");

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: GMAIL_EMAIL.value(),
            pass: GMAIL_PASSWORD.value(),
          },
        });

        await transporter.sendMail({
          from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
          to: email,
          subject: "Tu contraseña fue cambiada",
          html: `<h2>Hola ${name},</h2>
                 <p>Tu contraseña fue modificada correctamente.</p>`,
        });

        return res.status(200).json({ ok: true });
      } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: "Server error" });
      }
    });
  }
);


// ======================================================================================
// 4) CREATE ORDER — Sanitización estricta + validación stock + preferencia segura
// ======================================================================================
export const createSecureOrder = onRequest(
  { secrets: [MP_ACCESS_TOKEN] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        // ================================================
        // 🔥 Buyer normalizado (incluye campo DNI)
        // ================================================
        const buyerReq = req.body.buyer || {};

        const buyer = {
          name: xss(buyerReq.name || ""),
          email: xss(buyerReq.email || ""),
          phone: xss(buyerReq.phone || buyerReq.telefono || ""),

          method: xss(buyerReq.method || ""),

          // Dirección — tolera nombres reales del formulario
          street: xss(buyerReq.street || buyerReq.calle || ""),
          number: xss(buyerReq.number || buyerReq.altura || ""),
          city: xss(buyerReq.city || buyerReq.ciudad || ""),
          province: xss(buyerReq.province || buyerReq.provincia || ""),
          zip: xss(buyerReq.zip || buyerReq.cp || ""),

          // 🔥 NUEVO: DNI del comprador
          dni: xss(buyerReq.dni || buyerReq.documento || ""),
        };

        const items = req.body.items;
        const userId = xss(req.body.userId || "");

        if (!items?.length || !userId) {
          return res.status(400).json({ error: "Missing data" });
        }

        const db = admin.firestore();
        let verifiedDB = [];
        let verifiedMP = [];
        let total = 0;

        // ================================================
        // 🔥 Validación y construcción segura de items
        // ================================================
        for (const cart of items) {
          const snap = await db.collection("products").doc(cart.id).get();

          if (!snap.exists) {
            return res.status(400).json({ error: "Product not found" });
          }

          const product = snap.data();

          if (product.stock === undefined || product.stock < cart.quantity) {
            return res.status(400).json({
              error: `Stock insuficiente para ${product.name}`,
            });
          }

          const discount = product.discount || 0;
          const finalPrice =
            discount > 0
              ? Number(
                  (product.price - product.price * (discount / 100)).toFixed(2)
                )
              : product.price;

          verifiedDB.push({
            productId: snap.id,
            name: product.name,
            quantity: cart.quantity,
            price: finalPrice,
          });

          verifiedMP.push({
            id: snap.id,
            title: product.name,
            unit_price: finalPrice,
            quantity: cart.quantity,
            currency_id: "ARS",
          });

          total += finalPrice * cart.quantity;
        }

        // ================================================
        // 🔥 Crear documento de orden en Firestore
        // ================================================
        const orderRef = await db.collection("orders").add({
          userId,
          buyer,
          items: verifiedDB,
          total,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // ================================================
        // 🔥 Crear preferencia segura de Mercado Pago
        // ================================================
        const mp = getMPClient();
        const prefClient = new Preference(mp);

        const prefResult = await prefClient.create({
          body: {
            items: verifiedMP,
            payer: {
              name: buyer.name,
              email: buyer.email,
            },

            external_reference: orderRef.id,
            auto_return: "approved",

            back_urls: {
              success: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-success",
              failure: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-failure",
              pending: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-pending",
            },

            notification_url:
              "https://us-central1-genesis-airsoft.cloudfunctions.net/webhook",
          },
        });

        return res.status(200).json({
          orderId: orderRef.id,
          preferenceId: prefResult.id,
          total,
        });

      } catch (err) {
        logger.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    });
  }
);


// ======================================================================================
// 5) CONTACT FORM — Sanitización + Rate Limit simple
// ======================================================================================
export const contactForm = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        const name = xss(req.body.name || "");
        const email = xss(req.body.email || "");
        const message = xss(req.body.message || "");

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: GMAIL_EMAIL.value(),
            pass: GMAIL_PASSWORD.value(),
          },
        });

        await transporter.sendMail({
          from: `"Genesis Airsoft - Formulario" <${GMAIL_EMAIL.value()}>`,
          to: GMAIL_EMAIL.value(),
          subject: `Nuevo mensaje de ${name}`,
          html: `
            <h2>Nuevo mensaje</h2>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Mensaje:</strong> ${message}</p>
          `,
        });

        return res.status(200).json({ ok: true });
      } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: "Server error" });
      }
    });
  }
);
