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
exports.createPreference = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    try {
      console.log("🛒 Datos recibidos:", req.body);

      const { items, userId, orderId, email } = req.body;

      const body = {
        items: items.map((item) => ({
          id: item.id || "SKU-" + item.name.replace(/\s+/g, "-").toUpperCase(),
          title: item.name,
          description: item.description || "Producto de Genesis Airsoft",
          quantity: item.quantity,
          unit_price: item.price,
          currency_id: "ARS",
          category_id: item.category || "others"   // 🔥 requerido
        })),
        payer: { email: email || "comprador@ejemplo.com" },
         statement_descriptor: "GENESIS AIRSOFT",  // 🔥 requerido
        external_reference: orderId || `order_${Date.now()}`,
        metadata: { userId, orderId },
        back_urls: {
          success: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-success",
          failure: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-failure",
          pending: "https://virulently-phonolitic-adelia.ngrok-free.dev/checkout-pending",
        },
        notification_url: "https://us-central1-genesis-airsoft.cloudfunctions.net/webhook",
        auto_return: "approved",
      };

      const preference = new Preference(mp);
      const result = await preference.create({ body });

      res.status(200).json({ id: result.id });
    } catch (error) {
      console.error("❌ Error creando preferencia:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ✅ Webhook: recibe confirmación de pago y envía el mail
exports.webhook = functions.https.onRequest(async (req, res) => {
  try {
    const payment = req.body;
    console.log("📩 Notificación recibida de Mercado Pago:", payment);

    if (payment.type === "payment" && payment.data && payment.data.id) {
      const paymentId = payment.data.id;

      // Obtener datos completos del pago
      const { Payment } = require("mercadopago");
      const client = new Payment(mp);
      const result = await client.get({ id: paymentId });
      const paymentData = result || {};

      const orderId = paymentData.external_reference || paymentId;
      const totalAmount = paymentData.transaction_amount || 0;
      const paymentStatus = paymentData.status || "pending";

      console.log(`🧾 Estado del pago: ${paymentStatus}`);

      // Buscar la orden original en Firestore
      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      let buyerEmail = paymentData.payer?.email; // fallback
      if (orderSnap.exists) {
        const orderData = orderSnap.data();
        if (orderData?.buyer?.email) {
          buyerEmail = orderData.buyer.email; // ⬅ EMAIL REAL DEL USUARIO DE TU WEB
        }
      }

      // Actualizar Firestore
      await orderRef.set(
        {
          status: paymentStatus,
          total: totalAmount,
          email: buyerEmail,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`📦 Orden ${orderId} actualizada correctamente.`);

      // Enviar correo solo si es aprobado
      if (paymentStatus === "approved") {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"Genesis Airsoft" <${process.env.GMAIL_EMAIL}>`,
          to: buyerEmail,  // ← AHORA SÍ, EMAIL DEL USUARIO LOGUEADO
          subject: "✅ Confirmación de tu compra en Genesis Airsoft",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Gracias por tu compra 🛒</h2>
              <p>Tu pago ha sido <strong>aprobado</strong>.</p>
              <p><strong>ID de orden:</strong> ${orderId}</p>
              <p><strong>Monto:</strong> $${totalAmount.toFixed(2)}</p>
              <hr/>
              <p>Te contactaremos en breve con los detalles de envío o retiro en tienda.</p>
              <p>¡Gracias por confiar en <strong>Genesis Airsoft</strong>!</p>
            </div>
          `,
        });

        console.log(`📨 Correo enviado correctamente a: ${buyerEmail}`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook:", error);
    res.sendStatus(500);
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



