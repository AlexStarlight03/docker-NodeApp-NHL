const express = require("express");
const Item = require("../models/Item");

const router = express.Router();

router.get("/items", async (_req, res) => {
  const items = await Item.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post("/items", async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) {
    return res.status(400).json({ error: "Le titre est requis" });
  }

  const item = await Item.create({ title });
  return res.status(201).json(item);
});

module.exports = router;
