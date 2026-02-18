require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

async function createIndex() {
  await pc.createIndexForModel({
    name: "productos-demo",
    cloud: "aws",
    region: "us-east-1",
    embed: {
      model: "llama-text-embed-v2",
      fieldMap: {
        text: "content",
      },
    },
    waitUntilReady: true,
  });

  console.log("✅ Índice creado");
}

createIndex();
