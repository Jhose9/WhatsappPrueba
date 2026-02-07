require("dotenv").config();
// Import Express.js
const express = require("express");

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// Route for GET requests
app.get("/", (req, res) => {
  const {
    "hub.mode": mode,
    "hub.challenge": challenge,
    "hub.verify_token": token,
  } = req.query;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WEBHOOK VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// // Route for POST requests
// app.post("/", (req, res) => {
//   const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
//   console.log(`\n\nWebhook received ${timestamp}\n`);
//   console.log(JSON.stringify(req.body, null, 2));
//   res.status(200).end();
// });

// /* =========================
//    MENSAJES ENTRANTES
// ========================= */
// app.post("/", async (req, res) => {
//   try {
//     const entry = req.body.entry?.[0];
//     const change = entry?.changes?.[0];
//     const message = change?.value?.messages?.[0];

//     if (!message || message.type !== "text") {
//       return res.sendStatus(200);
//     }

//     const from = message.from;
//     const text = message.text.body.toLowerCase();

//     console.log("📩 Mensaje recibido:", text);

//     if (text === "hola") {
//       await sendMessage(from, "mundo");
//     }

//     res.sendStatus(200);
//   } catch (error) {
//     console.error("❌ Error:", error);
//     res.sendStatus(500);
//   }
// });

app.post("/", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    console.log("📩 Mensaje de:", from);

    // Responder con botones
    await sendMenu(from);

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error);
    res.sendStatus(500);
  }
});

/* =========================
   FUNCIÓN MENÚ BOTONES
========================= */
async function sendMenu(to) {
  const url = `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "Hola 👋 ¿Qué deseas hacer?",
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: {
              id: "PRODUCTOS",
              title: "📦 Ver productos",
            },
          },
          {
            type: "reply",
            reply: {
              id: "ASESOR",
              title: "💬 Hablar con asesor",
            },
          },
          {
            type: "reply",
            reply: {
              id: "SOPORTE",
              title: "❓ Soporte",
            },
          },
        ],
      },
    },
  };

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function sendMessage(to, body) {
  const url = `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`;

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        body,
      },
    }),
  });
}

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
