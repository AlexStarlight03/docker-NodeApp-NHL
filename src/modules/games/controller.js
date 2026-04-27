const dateUtils = require("../../utils/date");
const nhlService = require("../../services/nhl.service");
const { HomePage, GamePage, ErrorPage } = require("./views");
const { escapeHtml } = require("../../utils/html");

async function getTodayGames(req, res) {
	try {
		const date = dateUtils.isValidDateString(String(req.query.date || ""))
			? String(req.query.date)
			: dateUtils.todayDate();
		const { games } = await nhlService.getGamesByDate(date);
		res.status(200).json({ date, count: games.length, games });
	} catch (error) {
		res.status(502).json({ message: "Erreur NHL API", error: error.message });
	}
}

async function getHomePage(req, res) {
	try {
		const date = dateUtils.getDate(req.query.date);
		const { games } = await nhlService.getGamesByDate(date);
		const prevDate = dateUtils.moveDate(date, -1);
		const nextDate = dateUtils.moveDate(date, 1);

		res.status(200).send(HomePage({ date, prevDate, nextDate, games }));
	} catch (error) {
		res.status(502).send(ErrorPage({
			title: "Erreur API NHL",
			message: error.message,
			backHref: "/",
		}));
	}
}

async function getGamePage(req, res) {
	const gameId = String(req.params.id || "").trim();
	const backDate = dateUtils.isValidDateString(String(req.query.date || ""))
		? String(req.query.date)
		: dateUtils.todayDate();

	if (!/^\d+$/.test(gameId)) {
		res.status(400).send("ID de match invalide.");
		return;
	}

	try {
		const data = await nhlService.getGamePlayById(gameId);

		const away = data.awayTeam?.commonName?.default || data.awayTeam?.abbrev || "Away";
		const home = data.homeTeam?.commonName?.default || data.homeTeam?.abbrev || "Home";
		const awayScore = data.awayTeam?.score ?? "-";
		const homeScore = data.homeTeam?.score ?? "-";
		const state = data.gameState || "";
		const stateLabel = nhlService.gameStateLabel(state);
		const started = nhlService.hasStarted(state);
		const plays = started ? nhlService.mapPlays(data) : [];

		const statusMessage = started
			? "Play-by-play complet"
			: "Le match n'est pas encore commencé";

		res.status(200).send(GamePage({
			away,
			home,
			awayScore,
			homeScore,
			stateLabel,
			statusMessage,
			plays,
			backDate,
		}));
	} catch (error) {
		res.status(502).send(ErrorPage({
			title: "Erreur API NHL",
			message: error.message,
			backHref: `/?date=${escapeHtml(backDate)}`,
		}));
	}
}

function redirectHome(req, res) {
	res.redirect("/");
}

module.exports = {
	getTodayGames,
	getHomePage,
	getGamePage,
	redirectHome,
};