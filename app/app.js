const express = require("express");

const app = express();
const port = 8080;

app.use("/public", express.static("app/public"));

function todayDate() {
	return new Date().toISOString().slice(0, 10);
}

function isValidDateString(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const d = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function moveDate(oldDate, days) {
	const d = new Date(`${oldDate}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

function getDate(value) {
	if (isValidDateString(String(value || ""))) {
		return String(value);
	}

	return todayDate();
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function escapeJsonForScriptTag(value) {
	return JSON.stringify(value)
		.replaceAll("<", "\\u003c")
		.replaceAll(">", "\\u003e")
		.replaceAll("&", "\\u0026");
}

function formatDateTime(utcString) {
	if (!utcString) {
		return "N/A";
	}

	const d = new Date(utcString);
	if (Number.isNaN(d.getTime())) {
		return "N/A";
	}

	return new Intl.DateTimeFormat("fr-CA", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(d);
}

async function fetchJson(url) {
	const response = await fetch(url, { headers: { Accept: "application/json" } });
	if (!response.ok) {
		throw new Error(`NHL API error ${response.status} for ${url}`);
	}
	return response.json();
}

function gameStateLabel(gameState) {
	const state = String(gameState || "").toUpperCase();

	if (["LIVE", "CRIT"].includes(state)) {
		return "En cours";
	}

	if (["FINAL", "OFF"].includes(state)) {
		return "Terminé";
	}

	if (["FUT", "PRE", "SCHED"].includes(state)) {
		return "Non débuté";
	}

	if (["POST", "PST", "CANC", "CNCL"].includes(state)) {
		return "Annulé";
	}

	if (["MOVED", "MV", "RESCH", "RSCH"].includes(state)) {
		return "Déplacé";
	}

	return state || "Inconnu";
}

function mapTodayGames(payload, date) {
	if (!payload || !Array.isArray(payload.gameWeek)) {
		return [];
	}

	const day = payload.gameWeek.find((d) => d.date === date);
	if (!day || !Array.isArray(day.games)) {
		return [];
	}

	return day.games.map((g) => ({
		id: g.id,
		awayName: g.awayTeam?.commonName?.default || g.awayTeam?.abbrev || "N/A",
		homeName: g.homeTeam?.commonName?.default || g.homeTeam?.abbrev || "N/A",
		awayScore: g.awayTeam?.score ?? "-",
		homeScore: g.homeTeam?.score ?? "-",
		stateRaw: g.gameState || "",
		stateLabel: gameStateLabel(g.gameState),
		startTimeUTC: g.startTimeUTC,
		venue: g.venue?.default || "N/A",
	}));
}

async function getGamesByDate(date) {
	const payload = await fetchJson(`https://api-web.nhle.com/v1/schedule/${date}`);
	return { date, games: mapTodayGames(payload, date) };
}

function hasStarted(gameState) {
	const startedStates = new Set(["LIVE", "CRIT", "FINAL", "OFF"]);
	return startedStates.has(String(gameState || "").toUpperCase());
}

function mapPlays(payload) {
	if (!payload || !Array.isArray(payload.plays)) {
		return [];
	}

	const homeTeamId = payload.homeTeam?.id;
	const awayTeamId = payload.awayTeam?.id;
	const teamLabelById = new Map([
		[homeTeamId, payload.homeTeam?.abbrev || "HOME"],
		[awayTeamId, payload.awayTeam?.abbrev || "AWAY"],
	]);

	const playerById = new Map();
	if (Array.isArray(payload.rosterSpots)) {
		for (const p of payload.rosterSpots) {
			const first = p.firstName?.default || "";
			const last = p.lastName?.default || "";
			const fullName = `${first} ${last}`.trim() || `#${p.playerId}`;
			playerById.set(p.playerId, {
				name: fullName,
				number: p.sweaterNumber ?? "?",
				team: teamLabelById.get(p.teamId) || "N/A",
			});
		}
	}

	function playerRefsFromDetails(details, eventType) {
		if (!details || typeof details !== "object") {
			return [];
		}

		const refs = [];
		for (const [key, value] of Object.entries(details)) {
			if (!/playerid$/i.test(key)) {
				continue;
			}

			const playerId = Number(value);
			if (!Number.isFinite(playerId)) {
				continue;
			}

			const p = playerById.get(playerId);
			const role = key
				.replace(/PlayerId$/i, "")
				.replace(/([A-Z])/g, " $1")
				.trim()
				.toLowerCase();

			refs.push({
				role,
				playerId,
				name: p?.name || `Joueur ${playerId}`,
				number: p?.number ?? "?",
				team: p?.team || "N/A",
			});
		}

		// For faceoff events, put winning player first
		if (String(eventType || "").toLowerCase().includes("faceoff")) {
			refs.sort((a, b) => {
				if (a.role === "winning") return -1;
				if (b.role === "winning") return 1;
				return 0;
			});
		}

		return refs;
	}

	function formatPenaltyInfo(type, details) {
		if (!details || typeof details !== "object") {
			return null;
		}

		const typeText = String(type || "").toLowerCase();
		const looksLikePenalty =
			typeText.includes("penalty") ||
			"penaltySeverity" in details ||
			"penaltyMinutes" in details ||
			"duration" in details ||
			"penaltyDuration" in details;

		if (!looksLikePenalty) {
			return null;
		}

		const reason = details.reason || details.descKey || "Penalty";
		const severity = details.penaltySeverity || details.severity || "";

		const rawMinutes =
			details.penaltyMinutes ??
			details.minutes ??
			details.duration ??
			details.durationInMinutes ??
			details.penaltyDuration;

		const parsedMinutes = Number(rawMinutes);
		const minutesText = Number.isFinite(parsedMinutes)
			? `${parsedMinutes} min`
			: (rawMinutes ? String(rawMinutes) : "N/A");

		const left = severity ? `${reason} (${severity})` : String(reason);
		return `${left} - ${minutesText}`;
	}

	function playerLabelById(playerId) {
		const p = playerById.get(Number(playerId));
		if (!p) {
			return `Joueur ${playerId}`;
		}
		return `#${p.number} ${p.name}`;
	}

	function formatEventDescription(type, details) {
		if (!details || typeof details !== "object") {
			return "";
		}

		const typeText = String(type || "").toLowerCase();
		return details.reason || details.descKey || "";
	}

	return payload.plays.map((play) => ({
		period: play.periodDescriptor?.number ?? "-",
		timeInPeriod: play.timeInPeriod || "--:--",
		type: play.typeDescKey || "",
		team: teamLabelById.get(play.details?.eventOwnerTeamId) || "N/A",
		penaltyInfo: formatPenaltyInfo(play.typeDescKey, play.details),
		description: formatEventDescription(play.typeDescKey, play.details),
		players: playerRefsFromDetails(play.details, play.typeDescKey),
	}));
}

app.get("/api/games/today", async (req, res) => {
	try {
		const date = isValidDateString(String(req.query.date || ""))
			? String(req.query.date)
			: todayDate();
		const { games } = await getGamesByDate(date);
		res.status(200).json({ date, count: games.length, games });
	} catch (error) {
		res.status(502).json({ message: "Erreur NHL API", error: error.message });
	}
});

app.get("/", async (req, res) => {
	try {
		const date = getDate(req.query.date);
		const { games } = await getGamesByDate(date);
		const prevDate = moveDate(date, -1);
		const nextDate = moveDate(date, 1);

		const cards = games.length
			? games
					.map(
						(game) => `
						<a class="card" href="/game/${encodeURIComponent(game.id)}?date=${encodeURIComponent(date)}">
							<div class="teams">${escapeHtml(game.awayName)} vs ${escapeHtml(game.homeName)}</div>
							<div class="score">${escapeHtml(String(game.awayScore))} - ${escapeHtml(String(game.homeScore))}</div>
							<div class="meta">${escapeHtml(game.stateLabel)} | ${escapeHtml(formatDateTime(game.startTimeUTC))}</div>
							<div class="meta">${escapeHtml(game.venue)}</div>
						</a>
					`,
					)
					.join("")
			: '<p class="empty">Aucun match prévu aujourd hui.</p>';

		res.status(200).send(`<!doctype html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>NHL - Matchs du jour</title>
	<style>
		:root {
			--bg: #f2f6ff;
			--panel: #ffffff;
			--ink: #0f172a;
			--line: #d6dfea;
			--accent: #0b3c6f;
		}
		* { box-sizing: border-box; }
		body {
			margin: 0;
			font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
			color: var(--ink);
			background: radial-gradient(circle at 10% 0%, #dbeafe, var(--bg));
		}
		main {
			max-width: 1100px;
			margin: 2rem auto;
			padding: 0 1rem;
		}
		h1 { margin: 0 0 0.35rem; color: var(--accent); }
		.subtitle { margin: 0 0 1.25rem; color: #334155; }
		.date-nav {
			display: flex;
			align-items: center;
			gap: 0.7rem;
			margin-bottom: 1.25rem;
		}
		.arrow {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: 2rem;
			height: 2rem;
			border-radius: 999px;
			border: 1px solid var(--line);
			background: #fff;
			color: var(--accent);
			text-decoration: none;
			font-weight: 700;
		}
		.arrow:hover {
			background: #eaf2ff;
		}
		.date-label {
			font-weight: 600;
			color: #1e293b;
		}
		.grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
			gap: 0.9rem;
		}
		.card {
			display: block;
			text-decoration: none;
			background: var(--panel);
			border: 1px solid var(--line);
			border-radius: 12px;
			padding: 0.9rem;
			color: inherit;
			transition: transform 0.15s ease, box-shadow 0.15s ease;
		}
		.card:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
		}
		.teams { font-weight: 700; margin-bottom: 0.3rem; }
		.score { font-size: 1.25rem; margin-bottom: 0.3rem; }
		.meta { color: #475569; font-size: 0.9rem; }
		.empty {
			background: #fff;
			border: 1px dashed var(--line);
			padding: 1rem;
			border-radius: 10px;
		}
	</style>
</head>
<body>
	<main>
		<h1>NHL - Matchs du jour</h1>
		<div class="date-nav">
			<a class="arrow" href="/?date=${escapeHtml(prevDate)}" >&#8592;</a>
			<span class="date-label">${escapeHtml(date)}</span>
			<a class="arrow" href="/?date=${escapeHtml(nextDate)}" >&#8594;</a>
		</div>
		<section class="grid">${cards}</section>
	</main>
</body>
</html>`);
	} catch (error) {
		res.status(502).send(`<h1>Erreur API NHL</h1><p>${escapeHtml(error.message)}</p>`);
	}
});

app.get("/game/:id", async (req, res) => {
	const gameId = String(req.params.id || "").trim();
	const backDate = isValidDateString(String(req.query.date || ""))
		? String(req.query.date)
		: todayDate();
	if (!/^\d+$/.test(gameId)) {
		res.status(400).send("ID de match invalide.");
		return;
	}

	try {
		const data = await fetchJson(`https://api-web.nhle.com/v1/gamecenter/${gameId}/play-by-play`);

		const away = data.awayTeam?.commonName?.default || data.awayTeam?.abbrev || "Away";
		const home = data.homeTeam?.commonName?.default || data.homeTeam?.abbrev || "Home";
		const awayScore = data.awayTeam?.score ?? "-";
		const homeScore = data.homeTeam?.score ?? "-";
		const stateRaw = data.gameState || "";
		const stateLabel = gameStateLabel(stateRaw);
		const started = hasStarted(stateRaw);
		const plays = started ? mapPlays(data) : [];

		const statusMessage = started
			? "Play-by-play complet"
			: "Le match n'est pas encore commencé";

		const playsJson = escapeJsonForScriptTag(plays);

		res.status(200).send(`<!doctype html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>NHL - Match ${escapeHtml(away)} vs ${escapeHtml(home)}</title>
	<link rel="stylesheet" href="/public/teams.css">
	<style>
		:root {
			--bg: #f8fafc;
			--panel: #ffffff;
			--line: #d8e0ec;
			--ink: #0f172a;
		}
		* { box-sizing: border-box; }
		body { margin: 0; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: var(--bg); color: var(--ink); }
		main { max-width: 980px; margin: 1.5rem auto; padding: 0 1rem; }
		.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; }
		a { color: #1d4ed8; text-decoration: none; }
		a:hover { text-decoration: underline; }
		.score { font-size: 2rem; margin: 0.4rem 0; }
		.meta { color: #475569; }
		table { width: 100%; border-collapse: collapse; }
		th, td { border: 1px solid var(--line); padding: 0.55rem; text-align: left; }
		th { background: #eef4fb; }
		.chip { display: inline-block; padding: 0.1rem 0.45rem; border-radius: 999px; background: #e2e8f0; font-size: 0.82rem; margin: 0.1rem; }
		.note { color: #64748b; font-size: 0.9rem; margin-top: 0.5rem; }
		.separator-row td {
			background: #f1f5f9;
			font-weight: 700;
			color: #1e293b;
			border-top: 2px solid #94a3b8;
		}
		.spacer-row td {
			padding: 0;
			height: 35px;
			background: transparent;
			border: 0;
		}
	</style>
</head>
<body>
	<main>
		<div class="panel">
			<a href="/?date=${encodeURIComponent(backDate)}">Retour aux matchs</a>
			<h1>${escapeHtml(away)} vs ${escapeHtml(home)}</h1>
			<p class="score">${escapeHtml(String(awayScore))} - ${escapeHtml(String(homeScore))}</p>
			<p class="meta">Statut : ${escapeHtml(stateLabel)}</p>
		</div>

		<div class="panel">
			<h2>${escapeHtml(statusMessage)}</h2>
			<table>
				<thead>
					<tr>
						<th>Période</th>
						<th>Temps</th>
						<th>Type</th>
						<th>Équipe</th>
						<th>Joueurs impliqués</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody id="playsBody"></tbody>
			</table>
			<div id="scrollSentinel" class="note"></div>
		</div>
	</main>
	<script id="plays-data" type="application/json">${playsJson}</script>
	<script>
		(function () {
			const body = document.getElementById("playsBody");
			const sentinel = document.getElementById("scrollSentinel");
			const raw = document.getElementById("plays-data");
			if (!body || !sentinel || !raw) return;

			let plays = [];
			try {
				plays = JSON.parse(raw.textContent || "[]");
			} catch (e) {
				plays = [];
			}

			if (!plays.length) {
				const tr = document.createElement("tr");
				const td = document.createElement("td");
				td.colSpan = 6;
				td.textContent = "Aucun evenement a afficher.";
				tr.appendChild(td);
				body.appendChild(tr);
				sentinel.textContent = "";
				return;
			}

			const batchSize = 40;
			let index = 0;

			function playersText(players) {
				if (!Array.isArray(players) || players.length === 0) {
					return "";
				}
				return players
					.map((p) => p.role + ": #" + p.number + " " + p.name + " (" + p.team + ")")
					.join(" | ");
			}

			function isSeparatorType(type) {
				const t = String(type || "").toLowerCase();
				return t === "stoppage" || t === "period-start" || t === "period-end";
			}

			function isPeriodEndType(type) {
				return String(type || "").toLowerCase() === "period-end";
			}

			function appendBatch() {
				const end = Math.min(index + batchSize, plays.length);
				for (let i = index; i < end; i += 1) {
					const play = plays[i];

					if (isSeparatorType(play.type)) {
						const sepTr = document.createElement("tr");
						sepTr.className = "separator-row";
						const sepTd = document.createElement("td");
						sepTd.colSpan = 6;
						const typeLabel = String(play.type || "event").replaceAll("-", " ").toUpperCase();
						const desc = String(play.description || "");
						sepTd.textContent =
							typeLabel + " | P" + String(play.period ?? "-") + " | " + (play.timeInPeriod || "--:--") + (desc ? " | " + desc : "");
						sepTr.appendChild(sepTd);
						body.appendChild(sepTr);

						if (isPeriodEndType(play.type)) {
							const spacerTr = document.createElement("tr");
							spacerTr.className = "spacer-row";
							const spacerTd = document.createElement("td");
							spacerTd.colSpan = 6;
							spacerTr.appendChild(spacerTd);
							body.appendChild(spacerTr);
						}
						continue;
					}

					const tr = document.createElement("tr");

					const tdPeriod = document.createElement("td");
					tdPeriod.textContent = String(play.period ?? "-");
					tr.appendChild(tdPeriod);

					const tdTime = document.createElement("td");
					tdTime.textContent = play.timeInPeriod || "--:--";
					tr.appendChild(tdTime);

					const tdType = document.createElement("td");
					tdType.textContent = play.type || "event";
					tr.appendChild(tdType);

					const tdTeam = document.createElement("td");
					const hasTeam = Boolean(play.team) && String(play.team).toUpperCase() !== "N/A";
					if (hasTeam) {
						const teamValue = String(play.team).toUpperCase();
						const teamClass = "team-" + teamValue.replaceAll("/", "-").replaceAll(" ", "-");
						const chip = document.createElement("span");
						chip.className = "team-chip " + teamClass;
						chip.textContent = teamValue;
						tdTeam.appendChild(chip);
					}
					tr.appendChild(tdTeam);

					const tdPlayers = document.createElement("td");
					tdPlayers.textContent = playersText(play.players);
					tr.appendChild(tdPlayers);

					const tdDesc = document.createElement("td");
					tdDesc.textContent = play.penaltyInfo || String(play.description || "");
					tr.appendChild(tdDesc);

					body.appendChild(tr);
				}

				index = end;
				sentinel.textContent =
					index >= plays.length
						? "Toutes les actions sont affichées (" + plays.length + ")."
						: "Actions affichees: " + index + "/" + plays.length;
			}

			appendBatch();

			const observer = new IntersectionObserver((entries) => {
				if (entries.some((e) => e.isIntersecting) && index < plays.length) {
					appendBatch();
				}
			});

			observer.observe(sentinel);
		})();
	</script>
</body>
</html>`);
	} catch (error) {
		res.status(502).send(`<h1>Erreur API NHL</h1><p>${escapeHtml(error.message)}</p><p><a href="/">Retour</a></p>`);
	}
});

app.get("/{*splat}", (req, res) => {
	res.redirect("/");
});

app.listen(port, () => {
	console.log(`Serveur NHL lance sur le port ${port}`);
});