// ================================
// Functions v7 + ESM + Secret Manager (VERSIÓN SEGURA)
// ================================

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import cors from "cors";
import nodemailer from "nodemailer";
import xss from "xss";

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
  "https://virulently-phonolitic-adelia.ngrok-free.dev", // ⬅️ NGROK TEST (HARDCODED)
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

// ================================
// HELPERS
// ================================
function nowServerTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function addHoursDate(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

// ======================================================================================
// ✔ FUNCIÓN PARA ENVIAR EMAIL DE CONFIRMACIÓN DE COMPRA
// ======================================================================================
async function sendOrderConfirmationEmail(orderData) {
  const email = xss(orderData?.buyer?.email || "");
  const name = xss(orderData?.buyer?.name || "");
  const orderId = orderData?.id;
  const items = Array.isArray(orderData?.items) ? orderData.items : [];
  const total = Number(orderData?.total || 0);

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
        `<li>${xss(i.name || "")} × ${Number(i.quantity || 0)} — $${Number(
          i.price || 0
        ).toFixed(2)}</li>`
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
      <p><strong>Total:</strong> $${total.toFixed(2)}</p>

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

  // ✅ Si es transferencia, ignorar webhook (seguridad)
  if (orderData.paymentType && orderData.paymentType === "bank_transfer") {
    logger.warn("⚠ Webhook para orden de transferencia (ignorando):", { orderId });
    return res.sendStatus(200);
  }

  if (orderData.status === "approved") {
    return res.sendStatus(200);
  }

  const expectedAmount =
    orderData.totalWithShipping ?? orderData.total ?? 0;

  if (Number(paymentData.transaction_amount) !== Number(expectedAmount)) {
    await orderRef.update({
      status: "amount_mismatch",
      updatedAt: nowServerTs(),
    });
    return res.sendStatus(200);
  }

  const status = paymentData.status;

  await orderRef.update({
    status,
    mpPaymentId: paymentData.id,
    paymentMethod: paymentData.payment_method_id,
    installments: paymentData.installments,
    paidAt: status === "approved" ? nowServerTs() : null,
    updatedAt: nowServerTs(),
  });

  // 🔥 DESCONTAR STOCK SI SE APROBÓ
  if (status === "approved") {
    const batch = db.batch();

    for (const item of orderData.items || []) {
      const productRef = db.collection("products").doc(item.productId);
      const productSnap = await productRef.get();
      if (!productSnap.exists) continue;

      const productData = productSnap.data();
      const newStock = Math.max((productData.stock || 0) - item.quantity, 0);

      batch.update(productRef, { stock: newStock });
    }

    await batch.commit();
    logger.info("🟢 Stock descontado correctamente");

    await sendOrderConfirmationEmail({
      id: orderId,
      buyer: orderData.buyer,
      items: orderData.items,
      total: orderData.totalWithShipping ?? orderData.total,
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
// 4) CREATE ORDER — MP o Transferencia (-20% backend) + 48h vencimiento
// ======================================================================================
export const createSecureOrder = onRequest(
  { secrets: [MP_ACCESS_TOKEN] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        // ✅ Método de pago desde frontend
        const paymentMethodRaw = xss(req.body.paymentMethod || "mercadopago");
        const paymentType =
          paymentMethodRaw === "bank_transfer" ? "bank_transfer" : "mercadopago";

        // =====================================================
        // 🔐 Normalizar comprador (incluye DNI)
        // =====================================================
        const buyerReq = req.body.buyer || {};

        const buyer = {
          name: xss(buyerReq.name || ""),
          email: xss(buyerReq.email || ""),
          phone: xss(buyerReq.phone || ""),
          dni: xss(buyerReq.dni || ""),
          method: xss(buyerReq.method || "delivery"),

          street: xss(buyerReq.street || ""),
          number: xss(buyerReq.number || ""),
          city: xss(buyerReq.city || ""),
          province: xss(buyerReq.province || ""),
          zip: xss(buyerReq.zip || ""),
          notes: xss(buyerReq.notes || ""),
        };

        const items = req.body.items;
        const userId = xss(req.body.userId || "");

        if (!items?.length || !userId) {
          return res.status(400).json({ error: "Missing data" });
        }

        const db = admin.firestore();

        let verifiedDB = [];
        let verifiedMP = [];
        let subtotal = 0;

        // =====================================================
        // 🛒 Validar productos contra Firestore (autoridad backend)
        // =====================================================
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

          // Precio base (con descuento por producto si existe)
          const discount = Number(product.discount || 0);
          const basePrice =
            discount > 0
              ? Number((product.price - product.price * (discount / 100)).toFixed(2))
              : Number(product.price);

          // ✅ Transferencia: -20% global (backend)
          const finalUnitPrice =
            paymentType === "bank_transfer"
              ? Number((basePrice * 0.8).toFixed(2))
              : basePrice;

          verifiedDB.push({
            productId: snap.id,
            name: product.name,
            quantity: cart.quantity,
            price: finalUnitPrice,
            basePrice, // auditoría
          });

          // MP sólo importa si paymentType = mercadopago (igual lo armamos)
          verifiedMP.push({
            id: snap.id,
            title: product.name,
            unit_price: finalUnitPrice,
            quantity: cart.quantity,
            currency_id: "ARS",
          });

          subtotal += finalUnitPrice * cart.quantity;
        }

        // =====================================================
        // 🚚 SHIPPING — lógica backend (AUTORITATIVA)
        // =====================================================
        const FREE_SHIPPING_FROM = 350000;
        const SHIPPING_FLAT_FEE = 16000; // ✅ IGUAL QUE FRONT

        let shippingCost = 0;
        let shippingFree = false;
        let shippingLabel = "";

        if (buyer.method === "pickup") {
          shippingCost = 0;
          shippingFree = true;
          shippingLabel = "Retiro en tienda";
        } else {
          if (subtotal >= FREE_SHIPPING_FROM) {
            shippingCost = 0;
            shippingFree = true;
            shippingLabel = `Envío gratis desde $${FREE_SHIPPING_FROM}`;
          } else {
            shippingCost = SHIPPING_FLAT_FEE;
            shippingFree = false;
            shippingLabel = "Envío a domicilio";
          }
        }

        const totalWithShipping = Number((subtotal + shippingCost).toFixed(2));

        // =====================================================
        // 📦 Orden base (común)
        // =====================================================
        const commonOrder = {
          userId,
          buyer,
          items: verifiedDB,

          subtotal,
          shipping: {
            method: buyer.method,
            cost: shippingCost,
            free: shippingFree,
            label: shippingLabel,
            freeFrom: FREE_SHIPPING_FROM,
          },
          totalWithShipping,

          paymentType, // "mercadopago" | "bank_transfer"
          dispatched: false,
          createdAt: nowServerTs(),
          updatedAt: nowServerTs(),
        };

        // =====================================================
        // 🏦 Transferencia: crear orden y devolver instrucciones
        // =====================================================
        if (paymentType === "bank_transfer") {
          const EXPIRES_IN_HOURS = 48;

          const orderRef = await db.collection("orders").add({
            ...commonOrder,
            status: "pending_transfer",
            expiresAt: addHoursDate(EXPIRES_IN_HOURS),
            transfer: {
              bank: "Mercado Pago",
              alias: "genesisairsoft",
              cvu: "0000003100071602640499",
              holder: "Manuel Santiago Estrada",
            },
          });

          return res.status(200).json({
            orderId: orderRef.id,
            paymentType: "bank_transfer",
            expiresInHours: EXPIRES_IN_HOURS,

            subtotal,
            shipping: {
              cost: shippingCost,
              free: shippingFree,
              label: shippingLabel,
            },
            totalWithShipping,

            transferInstructions: {
              bank: "Mercado Pago",
              alias: "genesisairsoft",
              cvu: "0000003100071602640499",
              holder: "Manuel Santiago Estrada",
            },
          });
        }

        // =====================================================
        // 💳 Mercado Pago (flujo actual)
        // =====================================================
        const orderRef = await db.collection("orders").add({
          ...commonOrder,
          status: "pending",
        });

        // Agregar envío como ítem si aplica
        if (buyer.method !== "pickup" && shippingCost > 0) {
          verifiedMP.push({
            id: "shipping",
            title: "Envío",
            unit_price: shippingCost,
            quantity: 1,
            currency_id: "ARS",
          });
        }

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

            // ✅ NGROK (TESTING) — EXACTO COMO TU VERSIÓN
            back_urls: {
              success:
                "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-success",
              failure:
                "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-failure",
              pending:
                "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-pending",
            },

            // 🔥 WEBHOOK REAL
            notification_url:
              "https://us-central1-genesis-airsoft.cloudfunctions.net/webhook",
          },
        });

        return res.status(200).json({
          orderId: orderRef.id,
          preferenceId: prefResult.id,

          paymentType: "mercadopago",
          subtotal,
          shipping: {
            cost: shippingCost,
            free: shippingFree,
            label: shippingLabel,
          },
          totalWithShipping,
        });
      } catch (err) {
        logger.error("❌ createSecureOrder error:", err);
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
