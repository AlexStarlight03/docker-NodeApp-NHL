const path = require("path");
const express = require("express");

const gamesRouter = require("./modules/games");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.get("/public/teams.css", (req, res) => {
	res.sendFile(path.join(__dirname, "teams.css"));
});
app.use(gamesRouter);

app.get("/{*splat}", (req, res) => {
	res.redirect("/");
});

module.exports = app;