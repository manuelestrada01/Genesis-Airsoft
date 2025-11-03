const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const mercadopago = require("mercadopago");

admin.initializeApp();

// ✅ Nueva forma de inicializar Mercado Pago (SDK v2)
const mp = new mercadopago.MercadoPagoConfig({
  accessToken: "APP_USR-6037864097624605-110218-389b2e2f72b5522802c60d0f124da9a5-294400681",
});

// ✅ Importar el cliente de preferencias
const { Preference } = require("mercadopago");

exports.createPreference = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    try {
      const { items, userId, orderId } = req.body;

      const body = {
        items: items.map((item) => ({
          title: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          currency_id: "ARS",
        })),
        metadata: { userId, orderId },
        back_urls: {
          success: "https://tusitio.com/checkout-success",
          failure: "https://tusitio.com/checkout-failure",
          pending: "https://tusitio.com/checkout-pending",
        },
        auto_return: "approved",
      };

      // ✅ Crear preferencia usando el cliente
      const preference = new Preference(mp);
      const result = await preference.create({ body });

      res.status(200).json({ id: result.id });
    } catch (error) {
      console.error("❌ Error creating preference:", error);
      res.status(500).json({ error: error.message });
    }
  });
});
