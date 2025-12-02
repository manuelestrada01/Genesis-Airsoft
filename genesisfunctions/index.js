require("dotenv").config(); // ✅ Cargar variables desde .env
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const mercadopago = require("mercadopago");
const nodemailer = require("nodemailer");       

// Inicializar Firebase
admin.initializeApp();

// Configurar Mercado Pago
const mp = new mercadopago.MercadoPagoConfig({
  accessToken: "APP_USR-6037864097624605-110218-389b2e2f72b5522802c60d0f124da9a5-294400681",
});

const { Preference } = require("mercadopago");

// ✅ Crear preferencia de pago


// ✅ Webhook: recibe confirmación de pago y envía el mail
exports.webhook = functions.https.onRequest(async (req, res) => {
  try {
    const notification = req.body;
    console.log("📨 Webhook recibido:", notification);

    // Mercado Pago manda solo esto:
    // { "type": "payment", "data": { "id": "123456" } }
    if (!notification.type || notification.type !== "payment") {
      console.log("⚠ Webhook ignorado (no es un pago)");
      return res.sendStatus(200);
    }

    const paymentId = notification.data?.id;
    if (!paymentId) {
      console.log("⚠ Webhook sin paymentId");
      return res.sendStatus(200);
    }

    // Obtener datos completos del pago
    const { Payment } = require("mercadopago");
    const client = new Payment(mp);

    const paymentResponse = await client.get({ id: paymentId });
    const paymentData = paymentResponse;

    console.log("💰 Datos del pago:", paymentData);

    const orderId = paymentData.external_reference;
    if (!orderId) {
      console.error("❌ ERROR: No existe external_reference en el pago");
      return res.sendStatus(200);
    }

    // Buscar la orden original
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error("❌ ERROR: Orden no encontrada:", orderId);
      return res.sendStatus(200);
    }

    const orderData = orderSnap.data();

    // VALIDACIÓN: monto real del pago = monto de la orden
    const paymentAmount = paymentData.transaction_amount;
    if (paymentAmount !== orderData.total) {
      console.error("⚠ Monto pagado no coincide con la orden!");
      // NO marcamos paid, pero tampoco devolvemos error
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

    const status = paymentData.status; // approved, pending, rejected
    const buyerEmail =
      orderData.buyer?.email || paymentData.payer?.email || null;

    // Actualizar orden
    await orderRef.set(
      {
        status: status,
        mpPaymentId: paymentId,
        paymentMethod: paymentData.payment_method_id,
        installments: paymentData.installments,
        paidAt:
          status === "approved"
            ? admin.firestore.FieldValue.serverTimestamp()
            : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        rawPayment: paymentData, // Auditoría completa
      },
      { merge: true }
    );

    console.log(`📦 Orden ${orderId} actualizada: ${status}`);

    // Enviar email SOLO si está aprobado
    if (status === "approved" && buyerEmail) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Genesis Airsoft" <${process.env.GMAIL_EMAIL}>`,
        to: buyerEmail,
        subject: "✅ Confirmación de pago en Genesis Airsoft",
        html: `
          <h2>Gracias por tu compra</h2>
          <p>Tu pago fue aprobado correctamente.</p>
          <p><strong>ID Pedido:</strong> ${orderId}</p>
          <p><strong>Monto abonado:</strong> $${paymentAmount}</p>
          <hr/>
          <p>Nos contactaremos para coordinar el envío o retiro.</p>
        `,
      });

      console.log("📨 Email enviado a:", buyerEmail);
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error("❌ ERROR WEBHOOK:", e);
    // SIEMPRE responder 200 incluso si hay error interno.
    return res.sendStatus(200);
  }
});


//3) EMAIL AL CAMBIAR CONTRASEÑA
exports.passwordChanged = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { email, name } = req.body;

      console.log("🔐 Notificación cambio de password para:", email);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Genesis Airsoft" <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: "🔒 Tu contraseña fue actualizada",
        html: `
          <div style="font-family: Arial; color:#333;">
            <h2>Hola ${name},</h2>
            <p>Tu contraseña fue cambiada correctamente.</p>
            <p>Si vos <strong>no realizaste este cambio</strong>, contactanos de inmediato.</p>
          </div>
        `,
      });

      console.log(`📨 Email enviado correctamente a ${email}`);

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("❌ Error enviando email:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});

exports.createSecureOrder = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST")
        return res.status(405).send("Method not allowed");

      const { items, userId, buyer } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0)
        return res.status(400).send("No items provided");

      if (!userId) return res.status(400).send("User ID missing");

      const db = admin.firestore();

      let verifiedItems_MP = [];   // ← Ítems para Mercado Pago
      let verifiedItems_DB = [];   // ← Ítems para Firestore / Frontend
      let total = 0;

      // 🔥 VALIDACIÓN SEGURA + CÁLCULO REAL DE PRECIOS
      for (const cartItem of items) {
        const productRef = db.collection("products").doc(cartItem.id);
        const productSnap = await productRef.get();

        if (!productSnap.exists)
          return res.status(400).send(`Product ${cartItem.id} does not exist`);

        const product = productSnap.data();

        const discount = product.discount || 0;
        const hasDiscount = discount > 0;

        const finalPrice = hasDiscount
          ? Number((product.price - product.price * (discount / 100)).toFixed(2))
          : product.price;

        const qty = cartItem.quantity || 1;

        // ======================================
        // ✔ Datos PARA FIRESTORE (mostrar pedidos)
        // ======================================
        verifiedItems_DB.push({
          productId: productRef.id,
          name: product.name,
          price: finalPrice,
          quantity: qty
        });

        // =====================================================
        // ✔ Datos PARA MERCADOPAGO (exige campos específicos)
        // =====================================================
        verifiedItems_MP.push({
          id: productRef.id,                                     // ← Código único del ítem
          title: product.name,                                   // ← Nombre del producto
          description: product.description || "Producto Airsoft",// ← Descripción requerida
          category_id: product.category || "others",             // ← Categoría MP
          unit_price: finalPrice,
          quantity: qty,
          currency_id: "ARS"
        });

        total += finalPrice * qty;
      }

      // =======================================================
      // 🔥 CREAR ORDEN SEGURA EN FIRESTORE
      // =======================================================
      const orderRef = await db.collection("orders").add({
        userId,
        buyer,
        items: verifiedItems_DB,
        total,
        dispatched: false,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // =======================================================
      // 🔥 CREAR PREFERENCIA EN MERCADOPAGO (FORMATO ENRIQUECIDO)
      // =======================================================
      const preference = new Preference(mp);
      const prefResult = await preference.create({
        body: {
          items: verifiedItems_MP,
          payer: {
            name: buyer.name,
            email: buyer.email
          },
          external_reference: orderRef.id,
          statement_descriptor: "GENESIS AIRSOFT",
          back_urls: {
            success: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-success",
            failure: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-failure",
            pending: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-pending"
          },
          notification_url:
            "https://us-central1-genesis-airsoft.cloudfunctions.net/webhook",
          auto_return: "approved"
        }
      });

      // =======================================================
      // 🔥 RESPUESTA PARA EL FRONTEND
      // =======================================================
      res.status(200).json({
        orderId: orderRef.id,
        preferenceId: prefResult.id,
        total
      });

    } catch (err) {
      console.error("❌ Error en createSecureOrder:", err);
      res.status(500).send("Server error");
    }
  });
});

// ======================================================
// 4) FORMULARIO DE CONTACTO
// ======================================================
exports.contactForm = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send("Method not allowed");
      }

      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).send("Missing fields");
      }

      console.log("📨 Nuevo mensaje desde el formulario:", req.body);

      // Configurar transporte
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Genesis Airsoft - Formulario" <${process.env.GMAIL_EMAIL}>`,
        to: process.env.GMAIL_EMAIL, // <-- EL EMAIL QUE RECIBE LOS MENSAJES
        subject: `Nuevo mensaje de contacto de ${name}`,
        html: `
          <h2>Nuevo mensaje desde la web</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${message}</p>
          <hr>
          <p>Enviado automáticamente desde el formulario de contacto de Genesis Airsoft</p>
        `,
      });

      console.log("📩 Email enviado correctamente");

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("❌ Error en contacto:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});


