const express = require("express");

const controller = require("./controller");

const router = express.Router();

router.get("/api/games/today", controller.getTodayGames);
router.get("/", controller.getHomePage);
router.get("/game/:id", controller.getGamePage);

module.exports = router;