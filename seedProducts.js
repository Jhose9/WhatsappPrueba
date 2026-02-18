require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pc.index("productos-demo");

async function seedProducts() {
  const products = [
    {
      id: "camisa-blanca-m",
      content: "Camisa blanca para hombre talla M, algodón, elegante",
      metadata: {
        category: "camisa",
        color: "blanco",
        size: "M",
        gender: "hombre",
        discount: false,
      },
    },
    {
      id: "camisa-negra-l-desc",
      content: "Camisa negra talla L en descuento, casual",
      metadata: {
        category: "camisa",
        color: "negro",
        size: "L",
        gender: "unisex",
        discount: true,
      },
    },
    {
      id: "pantalon-negro-m",
      content: "Pantalón negro talla M para hombre, formal",
      metadata: {
        category: "pantalón",
        color: "negro",
        size: "M",
        gender: "hombre",
        discount: false,
      },
    },
  ];

  await index.upsert(products);
  console.log("✅ Productos cargados");
}

seedProducts();
