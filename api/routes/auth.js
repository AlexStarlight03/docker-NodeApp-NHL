const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/auth/register", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: "Nom d'utilisateur (3 characteres ou plus ) et mot de passe (6 characteres ou plus) requis" });
  }

  const existing = await User.findOne({ username });
  if (existing) {
    return res.status(409).json({ error: "Nom d'utilisateur deja utilise" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash });
  const token = signToken(user);

  return res.status(201).json({
    token,
    user: {
      id: user._id,
      username: user.username,
    },
  });
});

router.post("/auth/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "").trim();

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
    },
  });
});

module.exports = router;
