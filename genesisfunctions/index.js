// ================================
// Functions v7 + ESM + Secret Manager (PROD)
// ================================

import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
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
// PROD URLS (✅ sin ngrok)
// ================================
const PROD_BASE_URL = "https://genesisairsoft.com.ar"; // ✅ tu dominio productivo
const WEBHOOK_URL =
  "https://us-central1-genesis-airsoft.cloudfunctions.net/webhook";

// ================================
// CORS — SOLO DOMINIOS PERMITIDOS
// ================================
const allowedOrigins = [
  "http://localhost:5173", // dev
  "http://localhost:5174", // dev alt port
  "https://genesis-airsoft.web.app",
  "https://genesis-airsoft.firebaseapp.com",
  "https://genesisairsoft.com.ar",
  "https://www.genesisairsoft.com.ar",
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
  if (orderData.paymentType === "bank_transfer") {
    logger.warn("⚠ Webhook para orden de transferencia (ignorando):", { orderId });
    return res.sendStatus(200);
  }

  if (orderData.status === "approved") return res.sendStatus(200);

  const expectedAmount = orderData.totalWithShipping ?? orderData.total ?? 0;

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

        for (const cart of items) {
          const snap = await db.collection("products").doc(cart.id).get();
          if (!snap.exists) return res.status(400).json({ error: "Product not found" });

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

          verifiedMP.push({
            id: snap.id,
            title: product.name,
            unit_price: finalUnitPrice,
            quantity: cart.quantity,
            currency_id: "ARS",
          });

          subtotal += finalUnitPrice * cart.quantity;
        }

        // 🚚 SHIPPING — lógica backend (AUTORITATIVA)
        const FREE_SHIPPING_FROM = 350000;
        const SHIPPING_FLAT_FEE = 16000; // ✅ PROD real

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

        // 🏦 Transferencia
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
            shipping: { cost: shippingCost, free: shippingFree, label: shippingLabel },
            totalWithShipping,

            transferInstructions: {
              bank: "Mercado Pago",
              alias: "genesisairsoft",
              cvu: "0000003100071602640499",
              holder: "Manuel Santiago Estrada",
            },
          });
        }

        // 💳 Mercado Pago
        const orderRef = await db.collection("orders").add({
          ...commonOrder,
          status: "pending",
        });

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
            payer: { name: buyer.name, email: buyer.email },
            external_reference: orderRef.id,
            auto_return: "approved",

            // ✅ PROD (sin ngrok)
            back_urls: {
              success: `${PROD_BASE_URL}/checkout-success`,
              failure: `${PROD_BASE_URL}/checkout-failure`,
              pending: `${PROD_BASE_URL}/checkout-pending`,
            },

            // ✅ webhook
            notification_url: WEBHOOK_URL,
          },
        });

        return res.status(200).json({
          orderId: orderRef.id,
          preferenceId: prefResult.id,

          paymentType: "mercadopago",
          subtotal,
          shipping: { cost: shippingCost, free: shippingFree, label: shippingLabel },
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
          auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASSWORD.value() },
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

// ======================================================================================
// 6) CREATE RENTAL RESERVATION — Transacción atómica + email
// ======================================================================================
export const createRentalReservation = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const userId = xss(req.body.userId || "");
        const partidaId = xss(req.body.partidaId || "");
        const extrasIds = Array.isArray(req.body.extras) ? req.body.extras : [];
        const userReq = req.body.user || {};

        const userData = {
          name: xss(userReq.name || ""),
          email: xss(userReq.email || ""),
          phone: xss(userReq.phone || ""),
          dni: xss(userReq.dni || ""),
        };

        if (!userId || !partidaId || !userData.name || !userData.email || !userData.phone || !userData.dni) {
          return res.status(400).json({ error: "Datos incompletos" });
        }

        const firestore = admin.firestore();

        // Load rental config (server-side prices)
        const configSnap = await firestore.doc("rentalConfig/default").get();
        if (!configSnap.exists) {
          return res.status(500).json({ error: "Configuración de alquiler no encontrada" });
        }
        const config = configSnap.data();

        // Validate extras against config
        const validExtras = (config.extras || []).filter((e) =>
          extrasIds.includes(e.id)
        );

        const basePrice = Number(config.basePrice || 24000);
        const depositPercent = Number(config.depositPercent || 50);
        const expirationMinutes = Number(config.expirationMinutes || 30);

        // Transaction: check slots + create reservation
        const result = await firestore.runTransaction(async (t) => {
          const partidaRef = firestore.doc(`partidas/${partidaId}`);
          const partidaSnap = await t.get(partidaRef);

          if (!partidaSnap.exists) {
            throw new Error("Partida no encontrada");
          }

          const partida = partidaSnap.data();

          if (partida.status !== "active") {
            throw new Error("Esta partida ya no está disponible");
          }

          const now = new Date();
          const partidaDate = partida.horario?.toDate ? partida.horario.toDate() : new Date(partida.horario);
          if (partidaDate <= now) {
            throw new Error("Esta partida ya pasó");
          }

          if ((partida.slotsReserved || 0) >= (partida.slotsTotal || 0)) {
            throw new Error("No hay cupos disponibles");
          }

          // Check user doesn't already have active reservation for this partida
          const existingSnap = await firestore
            .collection("rentalReservations")
            .where("partidaId", "==", partidaId)
            .where("userId", "==", userId)
            .where("status", "in", ["pending_payment", "confirmed"])
            .get();

          if (!existingSnap.empty) {
            throw new Error("Ya tenés una reserva activa para esta partida");
          }

          // Apply partida-level discount (fallback to config default)
          const discountPct = Number(partida.discountPercent ?? config.defaultDiscountPercent ?? 0);
          const discountedBase = discountPct > 0 ? Math.round(basePrice * (1 - discountPct / 100)) : basePrice;
          const extrasTotal = validExtras.reduce((sum, e) => sum + Number(e.price), 0);
          const totalFull = discountedBase + extrasTotal;
          const deposit = Math.round(discountedBase * (depositPercent / 100));
          const remainingOnDay = totalFull - deposit;

          const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

          const reservationRef = firestore.collection("rentalReservations").doc();
          t.set(reservationRef, {
            partidaId,
            userId,
            user: userData,
            extras: validExtras,
            pricing: {
              basePrice: discountedBase,
              ...(discountPct > 0 && { originalBasePrice: basePrice, discountPercent: discountPct }),
              extrasTotal,
              totalFull,
              deposit,
              remainingOnDay,
            },
            status: "pending_payment",
            marcadoraNumber: null,
            expiresAt,
            paidAt: null,
            confirmedAt: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          t.update(partidaRef, {
            slotsReserved: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          return {
            reservationId: reservationRef.id,
            deposit,
            remainingOnDay,
            expiresAt: expiresAt.toISOString(),
          };
        });

        // Send emails (outside transaction)
        try {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASSWORD.value() },
          });

          const extrasHtml = validExtras.length
            ? validExtras.map((e) => `<li>${e.name} — $${e.price.toLocaleString("es-AR")}</li>`).join("")
            : "<li>Sin extras</li>";

          // Email to user
          await transporter.sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: userData.email,
            subject: "Reserva de alquiler creada - Genesis Airsoft",
            html: `
              <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                <h2 style="color:#c8f400;">Tu reserva fue creada</h2>
                <p>Hola <strong>${userData.name}</strong>,</p>
                <p>Tu reserva de alquiler fue registrada. Tenés <strong>${expirationMinutes} minutos</strong> para realizar la transferencia.</p>

                <h3 style="color:#c8f400;">Datos de transferencia</h3>
                <p><strong>Alias:</strong> ${config.transferAlias || "genesis.airsoft"}</p>
                <p><strong>CVU:</strong> ${config.transferCVU || ""}</p>
                <p><strong>Titular:</strong> ${config.transferHolder || ""}</p>
                <p><strong>Monto seña:</strong> $${result.deposit.toLocaleString("es-AR")}</p>

                <h3 style="color:#c8f400;">Extras seleccionados</h3>
                <ul>${extrasHtml}</ul>

                <p><strong>Total el día de la partida:</strong> $${result.remainingOnDay.toLocaleString("es-AR")}</p>

                <p style="color:#ff4444;"><strong>Importante:</strong> Si no se confirma el pago en ${expirationMinutes} minutos, la reserva se cancelará automáticamente.</p>
              </div>
            `,
          });

          // Email to admin
          await transporter.sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: GMAIL_EMAIL.value(),
            subject: `Nueva reserva de alquiler - ${userData.name}`,
            html: `
              <h2>Nueva reserva de alquiler</h2>
              <p><strong>Cliente:</strong> ${userData.name}</p>
              <p><strong>Email:</strong> ${userData.email}</p>
              <p><strong>Teléfono:</strong> ${userData.phone}</p>
              <p><strong>DNI:</strong> ${userData.dni}</p>
              <p><strong>Seña:</strong> $${result.deposit.toLocaleString("es-AR")}</p>
              <h3>Extras:</h3>
              <ul>${extrasHtml}</ul>
              <p><strong>ID Reserva:</strong> ${result.reservationId}</p>
            `,
          });
        } catch (emailErr) {
          logger.error("Error enviando emails de reserva:", emailErr);
        }

        return res.status(200).json({
          reservationId: result.reservationId,
          deposit: result.deposit,
          expiresAt: result.expiresAt,
          transferInfo: {
            alias: config.transferAlias || "genesis.airsoft",
            cvu: config.transferCVU || "",
            holder: config.transferHolder || "",
          },
        });
      } catch (err) {
        logger.error("createRentalReservation error:", err);
        const msg = err.message || "Error del servidor";
        return res.status(400).json({ error: msg });
      }
    });
  }
);

// ======================================================================================
// 7) EXPIRE RENTAL RESERVATIONS — Scheduled every 5 minutes
// ======================================================================================
export const expireRentalReservations = onSchedule(
  { schedule: "every 5 minutes", secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  async () => {
    const firestore = admin.firestore();
    const now = new Date();

    const snap = await firestore
      .collection("rentalReservations")
      .where("status", "==", "pending_payment")
      .where("expiresAt", "<=", now)
      .get();

    if (snap.empty) {
      logger.info("No hay reservas expiradas");
      return;
    }

    const batch = firestore.batch();
    const partidaDecrements = {};
    const emails = [];

    for (const doc of snap.docs) {
      const data = doc.data();

      batch.update(doc.ref, {
        status: "expired",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const pid = data.partidaId;
      partidaDecrements[pid] = (partidaDecrements[pid] || 0) + 1;

      if (data.user?.email) {
        emails.push(data.user);
      }
    }

    for (const [pid, count] of Object.entries(partidaDecrements)) {
      const partidaRef = firestore.doc(`partidas/${pid}`);
      batch.update(partidaRef, {
        slotsReserved: admin.firestore.FieldValue.increment(-count),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    logger.info(`Expiradas ${snap.size} reservas de alquiler`);

    // Send expiration emails
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASSWORD.value() },
      });

      for (const user of emails) {
        await transporter.sendMail({
          from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
          to: user.email,
          subject: "Tu reserva de alquiler ha expirado - Genesis Airsoft",
          html: `
            <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
              <h2 style="color:#ff4444;">Reserva expirada</h2>
              <p>Hola <strong>${user.name}</strong>,</p>
              <p>Tu reserva de alquiler expiró porque no se confirmó el pago a tiempo.</p>
              <p>Si querés, podés realizar una nueva reserva desde nuestra web.</p>
              <p><a href="https://genesisairsoft.com.ar/alquileres" style="color:#c8f400;">Ver partidas disponibles</a></p>
            </div>
          `,
        });
      }
    } catch (emailErr) {
      logger.error("Error enviando emails de expiración:", emailErr);
    }
  }
);

// ======================================================================================
// 8) ON RENTAL STATUS CHANGE — Firestore trigger for confirmation emails
// ======================================================================================
export const onRentalStatusChange = onDocumentUpdated(
  { document: "rentalReservations/{docId}", secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only act when status changes to "confirmed"
    if (before.status === after.status || after.status !== "confirmed") {
      return;
    }

    const user = after.user || {};
    if (!user.email) {
      logger.warn("Reserva confirmada sin email de usuario");
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASSWORD.value() },
      });

      // Load partida details
      const firestore = admin.firestore();
      const partidaSnap = await firestore.doc(`partidas/${after.partidaId}`).get();
      const partida = partidaSnap.exists ? partidaSnap.data() : {};

      const horario = partida.horario?.toDate
        ? partida.horario.toDate().toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" })
        : "A confirmar";

      const extrasHtml = (after.extras || []).length
        ? after.extras.map((e) => `<li>${e.name} — $${e.price.toLocaleString("es-AR")}</li>`).join("")
        : "<li>Sin extras</li>";

      await transporter.sendMail({
        from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
        to: user.email,
        subject: "Pago confirmado - Tu alquiler está reservado",
        html: `
          <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
            <h2 style="color:#c8f400;">Pago confirmado</h2>
            <p>Hola <strong>${user.name}</strong>,</p>
            <p>Tu pago fue confirmado. Tu alquiler de equipamiento está reservado.</p>

            <h3 style="color:#c8f400;">Detalles de la partida</h3>
            <p><strong>Lugar:</strong> ${partida.lugar || "A confirmar"}</p>
            <p><strong>Fecha:</strong> ${horario}</p>
            <p><strong>Modalidad:</strong> ${partida.modalidad || "A confirmar"}</p>

            <h3 style="color:#c8f400;">Tu equipamiento</h3>
            <p>Equipamiento base incluido: marcadora, batería, cargador y lentes.</p>
            <p><strong>Extras:</strong></p>
            <ul>${extrasHtml}</ul>

            <p><strong>Restante a pagar el día:</strong> $${(after.pricing?.remainingOnDay || 0).toLocaleString("es-AR")}</p>

            <h3 style="color:#c8f400;">Recordá</h3>
            <ul>
              <li>Traé tu DNI para firmar el contrato</li>
              <li>Usá lentes protectores obligatoriamente</li>
              <li>Solo se permiten BBs BLS</li>
            </ul>

            <p>Nos vemos en la partida.</p>
          </div>
        `,
      });

      logger.info("Email de confirmación de alquiler enviado a:", user.email);
    } catch (err) {
      logger.error("Error enviando email de confirmación de alquiler:", err);
    }
  }
);

// ======================================================================================
// 9) CANCEL RENTAL RESERVATION — User-initiated cancellation
// ======================================================================================
export const cancelRentalReservation = onRequest(
  {},
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

      try {
        // Verify Firebase Auth token
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!idToken) return res.status(401).json({ error: "No autorizado" });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const { reservationId } = req.body;
        if (!reservationId) return res.status(400).json({ error: "reservationId requerido" });

        const db = admin.firestore();
        const reservationRef = db.collection("rentalReservations").doc(reservationId);

        await db.runTransaction(async (t) => {
          const snap = await t.get(reservationRef);
          if (!snap.exists) throw new Error("Reserva no encontrada");

          const data = snap.data();
          if (data.userId !== uid) throw new Error("No autorizado");
          if (data.status !== "pending_payment") throw new Error("Solo se pueden cancelar reservas pendientes de pago");

          t.update(reservationRef, {
            status: "cancelled",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (data.partidaId) {
            const partidaRef = db.collection("partidas").doc(data.partidaId);
            t.update(partidaRef, {
              slotsReserved: admin.firestore.FieldValue.increment(-1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        });

        return res.status(200).json({ success: true });
      } catch (err) {
        logger.error("cancelRentalReservation error:", err);
        return res.status(400).json({ error: err.message || "Error del servidor" });
      }
    });
  }
);

// ======================================================================================
// 10) CREATE MANUAL RESERVATION — Admin-only, bypasses client Firestore rules
// ======================================================================================
export const createManualReservation = onRequest(
  {},
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

      try {
        // Verify Firebase Auth token + admin claim
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!idToken) return res.status(401).json({ error: "No autorizado" });

        const decoded = await admin.auth().verifyIdToken(idToken);
        if (decoded.role !== "admin") return res.status(403).json({ error: "Acceso denegado" });

        const { partidaId, user: userReq, extras: extrasIds, extrasQuantities, customExtra: customExtraReq, status, marcadoraNumber, notes, discountOverride } = req.body;

        if (!partidaId || !userReq?.name || !userReq?.email || !userReq?.phone || !userReq?.dni) {
          return res.status(400).json({ error: "Datos incompletos" });
        }

        const userData = {
          name: xss(userReq.name || ""),
          email: xss(userReq.email || ""),
          phone: xss(userReq.phone || ""),
          dni: xss(userReq.dni || ""),
        };

        const validStatus = ["fully_paid", "confirmed", "pending_payment"].includes(status) ? status : "fully_paid";
        const safeExtrasIds = Array.isArray(extrasIds) ? extrasIds : [];
        const safeQuantities = extrasQuantities && typeof extrasQuantities === "object" ? extrasQuantities : {};

        const firestore = admin.firestore();

        // Load config
        const configSnap = await firestore.doc("rentalConfig/default").get();
        if (!configSnap.exists) return res.status(500).json({ error: "Configuración no encontrada" });
        const config = configSnap.data();

        const validExtras = (config.extras || [])
          .filter((e) => safeExtrasIds.includes(e.id))
          .map((e) => ({ ...e, quantity: safeQuantities[e.id] === true || safeQuantities[e.id] === 2 ? 2 : 1 }));

        // Custom "Otro" extra
        const customExtraData = customExtraReq?.price > 0
          ? { id: "custom", name: xss(customExtraReq.name || "Otro"), price: Number(customExtraReq.price), quantity: 1 }
          : null;

        const basePrice = Number(config.basePrice || 24000);
        const depositPercent = Number(config.depositPercent || 50);
        const extrasTotal = validExtras.reduce((sum, e) => sum + Number(e.price) * e.quantity, 0)
          + (customExtraData ? customExtraData.price : 0);

        let reservationId;
        await firestore.runTransaction(async (t) => {
          const partidaRef = firestore.doc(`partidas/${partidaId}`);
          const partidaSnap = await t.get(partidaRef);
          if (!partidaSnap.exists) throw new Error("Partida no encontrada");

          const partida = partidaSnap.data();
          if ((partida.slotsReserved || 0) >= (partida.slotsTotal || 0)) {
            throw new Error("No hay cupos disponibles");
          }

          // Discount: override > partida-level > config default
          const rawDiscount = discountOverride !== undefined && discountOverride !== ""
            ? Number(discountOverride)
            : Number(partida.discountPercent ?? config.defaultDiscountPercent ?? 0);
          const discountPct = Math.min(Math.max(rawDiscount, 0), 100);
          const discountedBase = discountPct > 0 ? Math.round(basePrice * (1 - discountPct / 100)) : basePrice;
          const totalFull = discountedBase + extrasTotal;
          const deposit = Math.round(discountedBase * (depositPercent / 100));
          const remainingOnDay = totalFull - deposit;

          const pricing = {
            basePrice: discountedBase,
            ...(discountPct > 0 && { originalBasePrice: basePrice, discountPercent: discountPct }),
            extrasTotal,
            totalFull,
            deposit,
            remainingOnDay,
          };

          const reservationRef = firestore.collection("rentalReservations").doc();
          reservationId = reservationRef.id;

          t.set(reservationRef, {
            partidaId,
            userId: null,
            isManual: true,
            user: userData,
            extras: [...validExtras, ...(customExtraData ? [customExtraData] : [])],
            pricing,
            status: validStatus,
            marcadoraNumber: marcadoraNumber ? Number(marcadoraNumber) : null,
            notes: xss(notes || ""),
            expiresAt: null,
            paidAt: ["confirmed", "fully_paid"].includes(validStatus) ? admin.firestore.FieldValue.serverTimestamp() : null,
            fullyPaidAt: validStatus === "fully_paid" ? admin.firestore.FieldValue.serverTimestamp() : null,
            confirmedAt: ["confirmed", "fully_paid"].includes(validStatus) ? admin.firestore.FieldValue.serverTimestamp() : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          t.update(partidaRef, {
            slotsReserved: (partida.slotsReserved || 0) + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        return res.status(200).json({ reservationId });
      } catch (err) {
        logger.error("createManualReservation error:", err);
        return res.status(400).json({ error: err.message || "Error del servidor" });
      }
    });
  }
);

// ======================================================================================
// 11) CREATE SERVICIO TURNO — Reserva de turno de servicio técnico
// ======================================================================================
export const createServicioTurno = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!idToken) return res.status(401).json({ error: "No autorizado" });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const serviceType = xss(req.body.serviceType || "");
        const scheduledDate = xss(req.body.scheduledDate || "");
        const userReq = req.body.user || {};
        const replicaReq = req.body.replica || {};
        const addonIds = Array.isArray(req.body.addons) ? req.body.addons : [];
        const fallaReportada = xss(req.body.fallaReportada || "");
        const maintenanceSubtype = xss(req.body.maintenanceSubtype || "");
        const maintenanceVariant = xss(req.body.maintenanceVariant || "");
        const isRedeemed = req.body.isRedeemed === true;
        const locationReq = req.body.location || null;
        const locationData = locationReq ? {
          name: xss(locationReq.name || ""),
          address: xss(locationReq.address || ""),
          mapsUrl: xss(locationReq.mapsUrl || ""),
        } : null;

        if (!serviceType || !scheduledDate || !userReq.name || !userReq.email) {
          return res.status(400).json({ error: "Datos incompletos" });
        }
        if (serviceType === "tecnico" && !fallaReportada) {
          return res.status(400).json({ error: "Debe describir la falla" });
        }
        if (serviceType === "mantenimiento" && (!maintenanceSubtype || !maintenanceVariant)) {
          return res.status(400).json({ error: "Debe elegir subtipo y variante de mantenimiento" });
        }

        const userData = {
          name: xss(userReq.name || ""),
          email: xss(userReq.email || ""),
          phone: xss(userReq.phone || ""),
          instagram: xss(userReq.instagram || ""),
        };

        const replicaData = {
          marca: xss(replicaReq.marca || ""),
          modelo: xss(replicaReq.modelo || ""),
          serie: xss(replicaReq.serie || ""),
          tipo: xss(replicaReq.tipo || ""),
          gearbox: xss(replicaReq.gearbox || ""),
          fpsEstimado: xss(replicaReq.fpsEstimado || ""),
        };

        const firestore = admin.firestore();

        // Load servicioConfig server-side
        const configSnap = await firestore.doc("servicioConfig/default").get();
        if (!configSnap.exists) {
          return res.status(500).json({ error: "Configuración de servicio no encontrada. Configure el sistema primero." });
        }
        const config = configSnap.data();

        // Validate addons against config
        const validAddons = (config.addons || []).filter((a) => addonIds.includes(a.id));

        // Server-side pricing
        let serviceFee = 0;
        if (isRedeemed) {
          serviceFee = 0;
        } else if (serviceType === "tecnico") {
          serviceFee = Number(config.diagnosticFee || 17000);
        } else {
          const key = `${maintenanceSubtype}_${maintenanceVariant}`;
          serviceFee = Number(config.maintenance?.[key] || 0);
        }

        const addonsTotal = validAddons.reduce((sum, a) => sum + Number(a.price || 0), 0);
        const subtotal = serviceFee + addonsTotal;

        // Transaction: check slots + create turno
        const result = await firestore.runTransaction(async (t) => {
          const slotRef = firestore.doc(`servicioSlots/${scheduledDate}`);
          const slotSnap = await t.get(slotRef);

          if (!slotSnap.exists || !slotSnap.data().enabled) {
            throw new Error("Fecha no disponible para turnos");
          }

          const slotData = slotSnap.data();
          if ((slotData.slotsReserved || 0) >= (slotData.maxSlots || 5)) {
            throw new Error("No hay cupos disponibles para esa fecha");
          }

          // Check user doesn't already have active turno for same date
          const existingSnap = await firestore
            .collection("servicioTurnos")
            .where("userId", "==", uid)
            .where("scheduledDate", "==", scheduledDate)
            .where("status", "in", ["pending_approval", "approved", "in_progress"])
            .get();

          if (!existingSnap.empty) {
            throw new Error("Ya tenés un turno activo para esa fecha");
          }

          const turnoRef = firestore.collection("servicioTurnos").doc();
          t.set(turnoRef, {
            userId: uid,
            user: userData,
            serviceType,
            fallaReportada: serviceType === "tecnico" ? fallaReportada : "",
            maintenanceSubtype: serviceType === "mantenimiento" ? maintenanceSubtype : "",
            maintenanceVariant: serviceType === "mantenimiento" ? maintenanceVariant : "",
            addons: validAddons,
            scheduledDate,
            replica: replicaData,
            pricing: {
              serviceFee,
              addonsTotal,
              subtotal,
              discountPercent: 0,
              total: subtotal,
            },
            location: locationData,
            status: "pending_approval",
            planilla: null,
            isRedeemed,
            pointsAwarded: false,
            rejectionReason: "",
            adminNotes: "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedAt: null,
            completedAt: null,
          });

          t.update(slotRef, {
            slotsReserved: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          return { turnoId: turnoRef.id };
        });

        // Send emails
        try {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASSWORD.value() },
          });

          const serviceLabel = serviceType === "tecnico"
            ? "Servicio Técnico (Diagnóstico)"
            : `Service de Mantenimiento — ${maintenanceSubtype} ${maintenanceVariant}`;

          const addonsHtml = validAddons.length
            ? validAddons.map((a) => `<li>${a.name} — $${Number(a.price).toLocaleString("es-AR")}</li>`).join("")
            : "<li>Sin mejoras adicionales</li>";

          await transporter.sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: userData.email,
            subject: "Turno de servicio técnico solicitado - Genesis Airsoft",
            html: `
              <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                <h2 style="color:#c8f400;">Tu turno fue registrado</h2>
                <p>Hola <strong>${userData.name}</strong>,</p>
                <p>Tu solicitud de turno fue recibida. Está <strong>pendiente de aprobación</strong>.</p>
                <h3 style="color:#c8f400;">Detalle del turno</h3>
                <p><strong>Servicio:</strong> ${serviceLabel}</p>
                <p><strong>Fecha:</strong> ${scheduledDate}</p>
                <p><strong>Réplica:</strong> ${replicaData.marca} ${replicaData.modelo} (${replicaData.tipo})</p>
                ${serviceType === "tecnico" ? `<p><strong>Falla reportada:</strong> ${fallaReportada}</p>` : ""}
                <h3 style="color:#c8f400;">Mejoras seleccionadas</h3>
                <ul>${addonsHtml}</ul>
                <p><strong>Total estimado:</strong> $${subtotal.toLocaleString("es-AR")}</p>
                <p>Te avisaremos cuando tu turno sea aprobado.</p>
              </div>
            `,
          });

          await transporter.sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: GMAIL_EMAIL.value(),
            subject: `Nuevo turno de servicio — ${userData.name} (${scheduledDate})`,
            html: `
              <h2>Nuevo turno de servicio técnico</h2>
              <p><strong>Cliente:</strong> ${userData.name}</p>
              <p><strong>Email:</strong> ${userData.email}</p>
              <p><strong>Teléfono:</strong> ${userData.phone}</p>
              <p><strong>Servicio:</strong> ${serviceLabel}</p>
              <p><strong>Fecha:</strong> ${scheduledDate}</p>
              <p><strong>Réplica:</strong> ${replicaData.marca} ${replicaData.modelo} (${replicaData.tipo})</p>
              ${serviceType === "tecnico" ? `<p><strong>Falla:</strong> ${fallaReportada}</p>` : ""}
              <p><strong>Total:</strong> $${subtotal.toLocaleString("es-AR")}</p>
              <p><strong>ID Turno:</strong> ${result.turnoId}</p>
              ${isRedeemed ? "<p><strong>⭐ TURNO CANJEADO CON PUNTOS</strong></p>" : ""}
            `,
          });
        } catch (emailErr) {
          logger.error("Error enviando emails de turno:", emailErr);
        }

        return res.status(200).json({ turnoId: result.turnoId });
      } catch (err) {
        logger.error("createServicioTurno error:", err);
        return res.status(400).json({ error: err.message || "Error del servidor" });
      }
    });
  }
);

// ======================================================================================
// 12) CANCEL SERVICIO TURNO — User-initiated cancellation
// ======================================================================================
export const cancelServicioTurno = onRequest(
  {},
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

      try {
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!idToken) return res.status(401).json({ error: "No autorizado" });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const { turnoId } = req.body;
        if (!turnoId) return res.status(400).json({ error: "turnoId requerido" });

        const firestore = admin.firestore();
        const turnoRef = firestore.collection("servicioTurnos").doc(turnoId);

        await firestore.runTransaction(async (t) => {
          const snap = await t.get(turnoRef);
          if (!snap.exists) throw new Error("Turno no encontrado");

          const data = snap.data();
          if (data.userId !== uid) throw new Error("No autorizado");
          if (data.status !== "pending_approval") throw new Error("Solo se pueden cancelar turnos pendientes de aprobación");

          t.update(turnoRef, {
            status: "cancelled",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          if (data.scheduledDate) {
            const slotRef = firestore.doc(`servicioSlots/${data.scheduledDate}`);
            t.update(slotRef, {
              slotsReserved: admin.firestore.FieldValue.increment(-1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        });

        return res.status(200).json({ success: true });
      } catch (err) {
        logger.error("cancelServicioTurno error:", err);
        return res.status(400).json({ error: err.message || "Error del servidor" });
      }
    });
  }
);

// ======================================================================================
// 12b) APPROVE PRESUPUESTO — Client approves or rejects the presupuesto
// ======================================================================================
export const approvePresupuesto = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      try {
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!idToken) return res.status(401).json({ error: "No autorizado" });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const turnoId = xss(req.body.turnoId || "");
        const action = xss(req.body.action || ""); // "approve" | "reject"
        const rejectionReason = xss(req.body.rejectionReason || "");

        if (!turnoId || !["approve", "reject"].includes(action)) {
          return res.status(400).json({ error: "Datos inválidos" });
        }

        const firestore = admin.firestore();
        const turnoRef = firestore.doc(`servicioTurnos/${turnoId}`);
        const turnoSnap = await turnoRef.get();

        if (!turnoSnap.exists) return res.status(404).json({ error: "Turno no encontrado" });
        const turnoData = turnoSnap.data();

        if (turnoData.userId !== uid) return res.status(403).json({ error: "No autorizado" });
        if (turnoData.status !== "presupuesto_enviado") {
          return res.status(400).json({ error: "Estado inválido para esta acción" });
        }

        if (action === "approve") {
          await turnoRef.update({
            status: "presupuesto_aprobado",
            presupuestoApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await turnoRef.update({
            status: "presupuesto_rechazado",
            rejectionReason: rejectionReason || "Presupuesto rechazado por el cliente",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return res.status(200).json({ success: true });
      } catch (err) {
        logger.error("approvePresupuesto error:", err);
        return res.status(400).json({ error: err.message || "Error del servidor" });
      }
    });
  }
);

// ======================================================================================
// 13) ON SERVICIO STATUS CHANGE — Emails + points on completion
// ======================================================================================
export const onServicioStatusChange = onDocumentUpdated(
  { document: "servicioTurnos/{docId}", secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (before.status === after.status) return;

    const user = after.user || {};
    const firestore = admin.firestore();

    // Helper: create transporter lazily (keeps email failures isolated)
    const getTransporter = () => nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASSWORD.value() },
    });

    try {
      // Status → presupuesto_enviado: notify user to review presupuesto
      if (after.status === "presupuesto_enviado" && user.email) {
        const planilla = after.planilla || {};
        const totalStr = planilla.totalAPagar
          ? `$${Number(planilla.totalAPagar).toLocaleString("es-AR")}`
          : "—";
        try {
          await getTransporter().sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: user.email,
            subject: "Presupuesto listo para revisar - Genesis Airsoft",
            html: `
              <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                <h2 style="color:#c8f400;">Tu presupuesto está listo</h2>
                <p>Hola <strong>${user.name}</strong>,</p>
                <p>El técnico preparó el presupuesto para tu réplica <strong>${after.replica?.marca || ""} ${after.replica?.modelo || ""}</strong>.</p>
                <p><strong>Total a pagar: ${totalStr}</strong></p>
                <p>Ingresá a tu turno para revisar el detalle completo y <strong>aprobar o rechazar el presupuesto</strong>:</p>
                <p><a href="https://genesisairsoft.com.ar/servicio/turno-status/${event.params.docId}" style="background:#c8f400;color:#000;padding:12px 24px;border-radius:8px;font-weight:900;text-decoration:none;display:inline-block;">Ver presupuesto →</a></p>
                <p style="color:#888;font-size:12px;margin-top:20px;">N° Presupuesto: ${planilla.presupuestoNumber || "—"} | Técnico: ${planilla.tecnico || "—"}</p>
              </div>
            `,
          });
        } catch (emailErr) {
          logger.error("Error enviando email presupuesto_enviado:", emailErr);
        }
      }

      // Status → presupuesto_aprobado: notify admin
      if (after.status === "presupuesto_aprobado") {
        try {
          await getTransporter().sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: GMAIL_EMAIL.value(),
            subject: `Presupuesto aprobado por ${user.name} - Turno ${event.params.docId.slice(0, 8)}`,
            html: `
              <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                <h2 style="color:#c8f400;">Presupuesto aprobado</h2>
                <p><strong>${user.name}</strong> aprobó el presupuesto para su réplica.</p>
                <p>Esperando que el cliente envíe el comprobante de pago de repuestos.</p>
                <p><a href="https://genesisairsoft.com.ar/admin/servicio/${event.params.docId}" style="color:#c8f400;">Ver turno en admin →</a></p>
              </div>
            `,
          });
        } catch (emailErr) {
          logger.error("Error enviando email presupuesto_aprobado:", emailErr);
        }
      }

      // Status → parts_payment_review: notify admin that client paid
      if (after.status === "parts_payment_review") {
        try {
          await getTransporter().sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: GMAIL_EMAIL.value(),
            subject: `Comprobante de repuestos recibido - ${user.name}`,
            html: `
              <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                <h2 style="color:#c8f400;">Pago de repuestos recibido</h2>
                <p><strong>${user.name}</strong> subió el comprobante de pago de repuestos.</p>
                <p>Confirmá el pago para marcar el servicio como completado.</p>
                <p><a href="https://genesisairsoft.com.ar/admin/servicio/${event.params.docId}" style="color:#c8f400;">Revisar y confirmar →</a></p>
              </div>
            `,
          });
        } catch (emailErr) {
          logger.error("Error enviando email parts_payment_review:", emailErr);
        }
      }

      // Status → presupuesto_rechazado: notify admin
      if (after.status === "presupuesto_rechazado") {
        try {
          await getTransporter().sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: GMAIL_EMAIL.value(),
            subject: `Presupuesto rechazado por ${user.name}`,
            html: `
              <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                <h2 style="color:#f87171;">Presupuesto rechazado</h2>
                <p><strong>${user.name}</strong> rechazó el presupuesto.</p>
                <p>Motivo: ${after.rejectionReason || "Sin motivo indicado"}</p>
                <p><a href="https://genesisairsoft.com.ar/admin/servicio/${event.params.docId}" style="color:#c8f400;">Ver turno en admin →</a></p>
              </div>
            `,
          });
        } catch (emailErr) {
          logger.error("Error enviando email presupuesto_rechazado:", emailErr);
        }
      }

      // Status → approved: notify user
      if (after.status === "approved" && user.email) {
        try {
          await getTransporter().sendMail({
            from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
            to: user.email,
            subject: "Tu turno fue aprobado - Genesis Airsoft",
            html: `
              <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                <h2 style="color:#c8f400;">Turno aprobado</h2>
                <p>Hola <strong>${user.name}</strong>,</p>
                <p>Tu turno de servicio técnico para el <strong>${after.scheduledDate}</strong> fue <strong>aprobado</strong>.</p>
                <p>Podés seguir el estado desde <a href="https://genesisairsoft.com.ar/servicio/turno-status/${event.params.docId}" style="color:#c8f400;">tu página de turno</a>.</p>
              </div>
            `,
          });
        } catch (emailErr) {
          logger.error("Error enviando email aprobado:", emailErr);
        }
      }

      // Status → completed: award points FIRST (fully independent of email)
      if (after.status === "completed") {
        if (!after.pointsAwarded && !after.isRedeemed && after.userId) {
          try {
            const userRef = firestore.doc(`users/${after.userId}`);
            await firestore.runTransaction(async (t) => {
              const userSnap = await t.get(userRef);
              const currentPoints = userSnap.exists ? (userSnap.data().points || 0) : 0;
              const presupuestoNum = after.planilla?.presupuestoNumber || event.params.docId;

              const historyEntry = {
                date: admin.firestore.FieldValue.serverTimestamp(),
                delta: 10,
                reason: `Servicio completado — ${presupuestoNum}`,
                turnoId: event.params.docId,
              };

              t.set(userRef, {
                points: currentPoints + 10,
                pointsHistory: admin.firestore.FieldValue.arrayUnion(historyEntry),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }, { merge: true });

              t.update(event.data.after.ref, {
                pointsAwarded: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            });
            logger.info(`+10 puntos acreditados a usuario ${after.userId}`);
          } catch (pointsErr) {
            logger.error("Error acreditando puntos:", pointsErr);
          }
        }

        // Notify user via email (isolated — failure cannot block points)
        if (user.email) {
          try {
            await getTransporter().sendMail({
              from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
              to: user.email,
              subject: "Servicio completado - Genesis Airsoft",
              html: `
                <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                  <h2 style="color:#c8f400;">Servicio completado</h2>
                  <p>Hola <strong>${user.name}</strong>,</p>
                  <p>Tu servicio técnico fue completado. Ya podés descargar tu presupuesto desde <a href="https://genesisairsoft.com.ar/servicio/turno-status/${event.params.docId}" style="color:#c8f400;">tu página de turno</a>.</p>
                  ${!after.isRedeemed ? "<p><strong>+10 puntos Genesis</strong> acreditados en tu cuenta.</p>" : ""}
                </div>
              `,
            });
          } catch (emailErr) {
            logger.error("Error enviando email de completado:", emailErr);
          }
        }
      }
    } catch (err) {
      logger.error("onServicioStatusChange error:", err);
    }
  }
);

// ======================================================================================
// 14) REDEEM POINTS — Atomic points redemption
// ======================================================================================
export const redeemPoints = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

      try {
        const authHeader = req.headers.authorization || "";
        const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!idToken) return res.status(401).json({ error: "No autorizado" });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const redeemType = xss(req.body.redeemType || ""); // "service" | "bbs"
        const scheduledDate = xss(req.body.scheduledDate || "");
        const userReq = req.body.user || {};
        const replicaReq = req.body.replica || {};

        if (!redeemType || !["service", "bbs"].includes(redeemType)) {
          return res.status(400).json({ error: "Tipo de canje inválido" });
        }
        if (redeemType === "service" && !scheduledDate) {
          return res.status(400).json({ error: "Debe elegir una fecha para el service" });
        }

        const firestore = admin.firestore();
        const userRef = firestore.doc(`users/${uid}`);
        let turnoId = null;

        await firestore.runTransaction(async (t) => {
          const userSnap = await t.get(userRef);
          const currentPoints = userSnap.exists ? (userSnap.data().points || 0) : 0;

          if (currentPoints < 50) {
            throw new Error("Puntos insuficientes. Necesitás 50 puntos para canjear.");
          }

          const reason = redeemType === "service"
            ? "Canje: Service Primaria Común gratuito"
            : "Canje: Arcturus RS SPORT BBs 0.28g";

          const historyEntry = {
            date: admin.firestore.FieldValue.serverTimestamp(),
            delta: -50,
            reason,
          };

          t.set(userRef, {
            points: currentPoints - 50,
            pointsHistory: admin.firestore.FieldValue.arrayUnion(historyEntry),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });

          if (redeemType === "service") {
            // Check slot availability
            const slotRef = firestore.doc(`servicioSlots/${scheduledDate}`);
            const slotSnap = await t.get(slotRef);

            if (!slotSnap.exists || !slotSnap.data().enabled) {
              throw new Error("Fecha no disponible para turnos");
            }
            const slotData = slotSnap.data();
            if ((slotData.slotsReserved || 0) >= (slotData.maxSlots || 5)) {
              throw new Error("No hay cupos disponibles para esa fecha");
            }

            const userData = {
              name: xss(userReq.name || ""),
              email: xss(userReq.email || ""),
              phone: xss(userReq.phone || ""),
              instagram: xss(userReq.instagram || ""),
            };
            const replicaData = {
              marca: xss(replicaReq.marca || ""),
              modelo: xss(replicaReq.modelo || ""),
              serie: xss(replicaReq.serie || ""),
              tipo: xss(replicaReq.tipo || ""),
              gearbox: xss(replicaReq.gearbox || ""),
              fpsEstimado: xss(replicaReq.fpsEstimado || ""),
            };

            const turnoRef = firestore.collection("servicioTurnos").doc();
            turnoId = turnoRef.id;

            t.set(turnoRef, {
              userId: uid,
              user: userData,
              serviceType: "mantenimiento",
              maintenanceSubtype: "primaria",
              maintenanceVariant: "comun",
              fallaReportada: "",
              addons: [],
              scheduledDate,
              replica: replicaData,
              pricing: { serviceFee: 0, addonsTotal: 0, subtotal: 0, discountPercent: 0, total: 0 },
              status: "pending_approval",
              planilla: null,
              isRedeemed: true,
              pointsAwarded: false,
              rejectionReason: "",
              adminNotes: "",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              approvedAt: null,
              completedAt: null,
            });

            t.update(slotRef, {
              slotsReserved: admin.firestore.FieldValue.increment(1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        });

        // Send confirmation email
        try {
          if (userReq.email) {
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: { user: GMAIL_EMAIL.value(), pass: GMAIL_PASSWORD.value() },
            });

            const label = redeemType === "service"
              ? "Service Primaria Común gratuito"
              : "Pack Arcturus RS SPORT BBs 0.28g";

            await transporter.sendMail({
              from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
              to: xss(userReq.email || ""),
              subject: `Canje realizado: ${label} - Genesis Airsoft`,
              html: `
                <div style="background:#0f0f0f;color:#fff;padding:30px;font-family:Montserrat,sans-serif;">
                  <h2 style="color:#c8f400;">Canje realizado</h2>
                  <p>Canjeaste 50 puntos por: <strong>${label}</strong></p>
                  ${turnoId ? `<p>Turno registrado para el ${scheduledDate}. Pendiente de aprobación.</p>` : "<p>Pasá a retirar tu premio en Genesis Airsoft.</p>"}
                </div>
              `,
            });
          }
        } catch (emailErr) {
          logger.error("Error email canje:", emailErr);
        }

        return res.status(200).json({ success: true, turnoId });
      } catch (err) {
        logger.error("redeemPoints error:", err);
        return res.status(400).json({ error: err.message || "Error del servidor" });
      }
    });
  }
);
