require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemma-3-27b-it",
});

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

    const from = message.from; // número del usuario
    const text = message.text?.body?.toLowerCase().trim();

    console.log("Mensaje recibido:", text);

    if (text === "lista") {
      await sendList(from);
    } else if (text === "mapa") {
      await sendLocation(from);
    } else {
      //await sendMenu(from);
      // 1️⃣ BUSCAR EN PINECONE
      const products = await searchInPinecone(text);

      if (!products.length) {
        await sendMessage(from, "😕 No encontré productos similares.");
        return res.sendStatus(200);
      }

      // 2️⃣ PASAR DATA A GEMINI
      const reply = await describeProductsWithAI(products, text);

      // 3️⃣ RESPONDER
      await sendMessage(from, reply);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error webhook:", error);
    res.sendStatus(500);
  }
});
/* =========================
   PINECONE SEARCH
========================= */

async function searchInPinecone(text) {
  const index = pc.index("productos-demo");

  const result = await index.search({
    query: text, // 👈 TEXTO DIRECTO
    topK: 3,
    includeMetadata: true,
  });

  return result.matches;
}

/* =========================
   IA PRESENTACIÓN
========================= */

async function describeProductsWithAI(products, userMessage) {
  // 🔹 Pasamos los productos tal cual vienen del vector
  const context = products.map((p) => ({
    similarity: p.score,
    ...p.metadata,
  }));

  const prompt = `
Eres un asesor de ventas por WhatsApp.

El cliente escribió:
"${userMessage}"

A continuación tienes información REAL de productos obtenida desde una base de datos.
Usa SOLO esta información. No inventes nada.

Productos:
${JSON.stringify(context, null, 2)}

Tu tarea:
- Recomienda los productos más relevantes según lo que pidió el cliente
- Destaca solo los atributos importantes (no todos si no hace falta)
- Usa un tono natural, cercano y comercial
- Si hay descuento, resáltalo
- Si hay varios productos, compáralos brevemente
- No menciones "metadata", "vectores" ni "similitud"

Responde en un solo mensaje de WhatsApp.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

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

async function sendLocation(to) {
  const url = `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "location",
    location: {
      latitude: 4.711,
      longitude: -74.0721,
      name: "Oficina principal",
      address: "Bogotá, Colombia",
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

async function sendList(to) {
  const url = `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: "📋 Estas son nuestras opciones disponibles:",
      },
      action: {
        button: "Ver opciones",
        sections: [
          {
            title: "Servicios",
            rows: [
              { id: "VENTAS", title: "🛒 Ventas" },
              { id: "SOPORTE", title: "🛠 Soporte técnico" },
              { id: "ASESOR", title: "💬 Hablar con asesor" },
            ],
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

async function analyzeMessage(message) {
  const prompt = `
  Eres un analizador de mensajes de WhatsApp para una tienda online.

  Extrae la intención del usuario y los filtros de búsqueda.

  Devuelve SOLO un JSON válido con esta estructura:
  {
    "intent": "productos" | "saludo" | "soporte" | "otro",
    "category": string | null,
    "discount": boolean,
    "price_range": "bajo" | "medio" | "alto" | null,
    "gender": "hombre" | "mujer" | "unisex" | null,
    "color": string | null,
    "size": string | null,
    "confidence": number
  }

  Ejemplos:
  - "camisas en descuento" → category: "camisas", discount: true
  - "zapatos baratos para hombre" → category: "zapatos", price_range: "bajo", gender: "hombre"
  - "pantalón negro talla m" → category: "pantalón", color: "negro", size: "M"

  Mensaje:
  "${message}"

  No expliques nada.
  No uses markdown.
  Solo JSON.
  `;

  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // 🔥 LIMPIEZA CRÍTICA
  text = text.replace(/```json|```/g, "").trim();

  return JSON.parse(text);
}

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
