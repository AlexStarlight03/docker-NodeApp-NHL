require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const healthRoutes = require("./routes/health");
const itemRoutes = require("./routes/items");
const authRoutes = require("./routes/auth");
const favoriteRoutes = require("./routes/favorites");

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api", itemRoutes);
app.use("/api", authRoutes);
app.use("/api", favoriteRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

async function start() {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL est manquant");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET est manquant");
  }

  await mongoose.connect(process.env.MONGO_URL);
  app.listen(port, () => {
    console.log(`API en ecoute sur http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Echec demarrage API:", error.message);
  process.exit(1);
});
