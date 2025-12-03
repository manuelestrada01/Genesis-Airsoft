// ================================
// Functions v7 + ESM + Secret Manager
// ================================

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import admin from "firebase-admin";
import cors from "cors";
import nodemailer from "nodemailer";

import {
  MercadoPagoConfig,
  Payment,
  Preference,
} from "mercadopago";

// ------------------------
// Init Firebase Admin
// ------------------------
admin.initializeApp();
const corsHandler = cors({ origin: true });

// ------------------------
// Secrets (REAL SECURITY)
// ------------------------
const MP_ACCESS_TOKEN = defineSecret("MP_ACCESS_TOKEN");
const GMAIL_EMAIL = defineSecret("GMAIL_EMAIL");
const GMAIL_PASSWORD = defineSecret("GMAIL_PASSWORD");

// ------------------------
// MERCADO PAGO CLIENT
// ------------------------
function getMPClient() {
  return new MercadoPagoConfig({
    accessToken: MP_ACCESS_TOKEN.value(),
  });
}

// ============================================================
// 1) WEBHOOK MERCADO PAGO
// ============================================================
export const webhook = onRequest(
  {
    secrets: [MP_ACCESS_TOKEN, GMAIL_EMAIL, GMAIL_PASSWORD],
  },
  async (req, res) => {
    try {
      const notification = req.body;
      logger.info("📨 Webhook recibido:", notification);

      if (notification.type !== "payment") return res.sendStatus(200);

      const paymentId = notification.data?.id;
      if (!paymentId) return res.sendStatus(200);

      const mp = getMPClient();
      const client = new Payment(mp);
      const paymentData = await client.get({ id: paymentId });

      logger.info("💰 Datos del pago:", paymentData);

      const orderId = paymentData.external_reference;
      if (!orderId) return res.sendStatus(200);

      const db = admin.firestore();
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) return res.sendStatus(200);

      const orderData = orderSnap.data();

      // Validación del monto
      if (paymentData.transaction_amount !== orderData.total) {
        await orderRef.set(
          {
            status: "amount_mismatch",
            mpPaymentId: paymentId,
            mpRawData: paymentData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return res.sendStatus(200);
      }

      const status = paymentData.status;
      const buyerEmail =
        orderData.buyer?.email || paymentData.payer?.email || null;

      // Actualizar orden
      await orderRef.set(
        {
          status,
          mpPaymentId: paymentId,
          paymentMethod: paymentData.payment_method_id,
          installments: paymentData.installments,
          paidAt:
            status === "approved"
              ? admin.firestore.FieldValue.serverTimestamp()
              : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          rawPayment: paymentData,
        },
        { merge: true }
      );

      // Enviar email si está aprobado
      if (status === "approved" && buyerEmail) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: GMAIL_EMAIL.value(),
            pass: GMAIL_PASSWORD.value(),
          },
        });

        await transporter.sendMail({
          from: `"Genesis Airsoft" <${GMAIL_EMAIL.value()}>`,
          to: buyerEmail,
          subject: "Pago aprobado",
          html: `
            <h2>Gracias por tu compra</h2>
            <p>Pago aprobado para la orden <strong>${orderId}</strong>.</p>
            <p>Monto abonado: <strong>$${paymentData.transaction_amount}</strong></p>
          `,
        });
      }

      return res.sendStatus(200);
    } catch (e) {
      logger.error("❌ ERROR WEBHOOK:", e);
      return res.sendStatus(200);
    }
  }
);

// ============================================================
// 2) PASSWORD CHANGED EMAIL
// ============================================================
export const passwordChanged = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        const { email, name } = req.body;

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
          html: `
            <h2>Hola ${name},</h2>
            <p>Tu contraseña fue modificada correctamente.</p>
          `,
        });

        return res.status(200).json({ ok: true });
      } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: error.message });
      }
    });
  }
);

// ============================================================
// 3) CREAR ORDEN + PREFERENCIA MP
// ============================================================
export const createSecureOrder = onRequest(
  { secrets: [MP_ACCESS_TOKEN] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST")
          return res.status(405).send("Method not allowed");

        const { items, userId, buyer } = req.body;

        if (!items?.length || !userId)
          return res.status(400).send("Missing data");

        const db = admin.firestore();
        let verifiedMP = [];
        let verifiedDB = [];
        let total = 0;

        for (const cart of items) {
          const snap = await db.collection("products").doc(cart.id).get();
          if (!snap.exists) return res.status(400).send("Product not found");

          const product = snap.data();
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
            unit_price: finalPrice,
            quantity: cart.quantity,
            currency_id: "ARS",
          });

          total += finalPrice * cart.quantity;
        }

        const orderRef = await db.collection("orders").add({
          userId,
          buyer,
          items: verifiedDB,
          total,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const mp = getMPClient();
        const prefClient = new Preference(mp);
        const prefResult = await prefClient.create({
          body: {
            items: verifiedMP,
            payer: { email: buyer.email, name: buyer.name },
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

        res.status(200).json({
          orderId: orderRef.id,
          preferenceId: prefResult.id,
          total,
        });
      } catch (err) {
        logger.error(err);
        res.status(500).send("Server error");
      }
    });
  }
);

// ============================================================
// 4) CONTACT FORM
// ============================================================
export const contactForm = onRequest(
  { secrets: [GMAIL_EMAIL, GMAIL_PASSWORD] },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        const { name, email, message } = req.body;

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
            <p>Nombre: ${name}</p>
            <p>Email: ${email}</p>
            <p>Mensaje: ${message}</p>
          `,
        });

        return res.status(200).json({ ok: true });
      } catch (error) {
        logger.error(error);
        return res.status(500).json({ error: error.message });
      }
    });
  }
);
