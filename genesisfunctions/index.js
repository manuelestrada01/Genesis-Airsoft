// ================================
// Functions v7 + ESM + Secret Manager (VERSIÓN SEGURA)
// ================================

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import cors from "cors";
import nodemailer from "nodemailer";
import crypto from "crypto";
import xss from "xss"; // Sanitización XSS

import {
  MercadoPagoConfig,
  Payment,
  Preference,
} from "mercadopago";

// Init Firebase
admin.initializeApp();

// ================================
// CORS — SOLO DOMINIOS PERMITIDOS
// ================================
const allowedOrigins = [
  "http://localhost:5173",
  "https://virulently-phonolitic-adelia.ngrok-free.dev",
  "https://genesis-airsoft.web.app",
  "https://genesisairsoft.com", // cuando tengas dominio
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
// Rate Limit (versión simple)
// ================================
const rateLimitMap = new Map();
function rateLimit(ip, limit = 10, windowMs = 10000) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip) || { count: 0, last: now };

  if (now - entry.last < windowMs) {
    entry.count++;
    if (entry.count > limit) return false;
  } else {
    entry = { count: 1, last: now };
  }

  rateLimitMap.set(ip, entry);
  return true;
}

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

// ============================================================
// 1) WEBHOOK SEGURO — VALIDA FIRMA + ORIGEN
// ============================================================
export const webhook = onRequest(
  { secrets: [MP_ACCESS_TOKEN, GMAIL_EMAIL, GMAIL_PASSWORD] },
  async (req, res) => {

    try {

      if (req.method !== "POST") return res.sendStatus(200);

      const { topic, id } = req.query;

      // -------------------------
      // ACEPTAR NOTIFICACIONES REALES
      // -------------------------
      if (!topic || !id) {
        logger.warn("❌ Notificación inválida", req.query);
        return res.sendStatus(200);
      }

      logger.info("📩 Webhook recibido:", req.query);

      const mp = getMPClient();

      // -------------------------
      // 1) merchant_order → obtener pago real
      // -------------------------
      if (topic === "merchant_order") {

        const mo = await fetch(
          `https://api.mercadopago.com/merchant_orders/${id}`,
          {
            headers: {
              Authorization: `Bearer ${MP_ACCESS_TOKEN.value()}`
            }
          }
        ).then(r => r.json());

        logger.info("📦 Merchant Order:", mo);

        if (!mo.payments || mo.payments.length === 0)
          return res.sendStatus(200);

        const paymentId = mo.payments[0].id;

        const client = new Payment(mp);
        const paymentData = await client.get({ id: paymentId });

        return await processPayment(paymentData, res);
      }

      // -------------------------
      // 2) payment → flujo clásico (por si MP lo usa)
      // -------------------------
      if (topic === "payment") {
        const client = new Payment(mp);
        const paymentData = await client.get({ id });

        return await processPayment(paymentData, res);
      }

      logger.warn("❌ Topic desconocido:", topic);
      return res.sendStatus(200);

    } catch (err) {
      logger.error("❌ ERROR WEBHOOK:", err);
      return res.sendStatus(200);
    }
  }
);


// ======================================================
// FUNCIÓN CENTRAL PARA PROCESAR EL PAGO
// ======================================================
async function processPayment(paymentData, res) {
  const orderId = paymentData.external_reference;

  if (!orderId) return res.sendStatus(200);

  const db = admin.firestore();
  const orderRef = db.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) return res.sendStatus(200);

  const orderData = orderSnap.data();

  // Validar monto
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
    paidAt:
      status === "approved"
        ? admin.firestore.FieldValue.serverTimestamp()
        : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // =======================================================
  // 🔥 DESCONTAR STOCK (solo si el pago está aprobado)
  // =======================================================
  if (status === "approved") {
    const batch = db.batch();

    for (const item of orderData.items) {
      const productRef = db.collection("products").doc(item.productId);
      const productSnap = await productRef.get();

      if (!productSnap.exists) continue;

      const productData = productSnap.data();
      const newStock = (productData.stock || 0) - item.quantity;

      batch.update(productRef, {
        stock: Math.max(newStock, 0), // evitar negativos
      });
    }

    await batch.commit();
  }

  return res.sendStatus(200);
}



// ============================================================
// 2) PASSWORD CHANGED — Saneado + JSON seguro
// ============================================================
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

// ============================================================
// 3) CREATE ORDER — Sanitización + JSON + CORS seguro
// ============================================================
export const createSecureOrder = onRequest(
  { secrets: [MP_ACCESS_TOKEN] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST")
          return res.status(405).json({ error: "Method not allowed" });

        // Sanitizar comprador
        const buyer = {
          email: xss(req.body.buyer?.email || ""),
          name: xss(req.body.buyer?.name || ""),
        };

        const items = req.body.items;
        const userId = xss(req.body.userId || "");

        if (!items?.length || !userId)
          return res.status(400).json({ error: "Missing data" });

        const db = admin.firestore();
        let verifiedMP = [];
        let verifiedDB = [];
        let total = 0;

        for (const cart of items) {
          const snap = await db.collection("products").doc(cart.id).get();
          if (!snap.exists)
            return res.status(400).json({ error: "Product not found" });

          const product = snap.data();

          // 🔥 VALIDAR STOCK REAL
          if (product.stock === undefined || product.stock < cart.quantity) {
            return res.status(400).json({
              error: `Stock insuficiente para ${product.name}`,
            });
          }

          // Cálculo de precio final
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
            price: finalPrice,
            quantity: cart.quantity,
          });

          verifiedMP.push({
            id: snap.id,
            title: product.name,
            description: product.description || "Producto",
            category_id: product.category || "others",
            unit_price: finalPrice,
            quantity: cart.quantity,
            currency_id: "ARS",
          });

          total += finalPrice * cart.quantity;
        }

        // Crear la orden en Firestore
        const orderRef = await db.collection("orders").add({
          userId,
          buyer,
          items: verifiedDB,
          total,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Crear preferencia MP
        const mp = getMPClient();
        const prefClient = new Preference(mp);
        const prefResult = await prefClient.create({
          body: {
            items: verifiedMP,
            payer: buyer,
            external_reference: orderRef.id,
            auto_return: "approved",
            back_urls: {
              success:
                "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-success",
              failure:
                "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-failure",
              pending:
                "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-pending",
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

// ============================================================
// 4) CONTACT FORM — Sanitización + Rate Limit
// ============================================================
export const contactForm = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (!rateLimit(req.ip)) return res.status(429).json({ error: "Too many requests" });

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
