const { escapeHtml, escapeJsonForScriptTag, formatDateTime } = require("../../utils/html");

function HomePage({ date, prevDate, nextDate, games }) {
	const cards = games.length
		? games
				.map((game) => `
					<a class="card" href="/game/${encodeURIComponent(game.id)}?date=${encodeURIComponent(date)}">
						<div class="teams">${escapeHtml(game.awayName)} vs ${escapeHtml(game.homeName)}</div>
						<div class="score">${escapeHtml(String(game.awayScore))} - ${escapeHtml(String(game.homeScore))}</div>
						<div class="meta">${escapeHtml(game.stateLabel)} | ${escapeHtml(formatDateTime(game.startTimeUTC))}</div>
						<div class="meta">${escapeHtml(game.venue)}</div>
					</a>
				`)
				.join("")
			: '<p class="empty">Aucun match prévu aujourd hui.</p>';

	return `<!doctype html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>NHL - Matchs du jour</title>
	<link rel="stylesheet" href="/public/teams.css">
</head>
<body class="home-page">
	<main class="page-shell">
		<h1>NHL - Matchs du jour</h1>
		<div class="date-nav">
			<a class="arrow" href="/?date=${escapeHtml(prevDate)}">&#8592;</a>
			<span class="date-label">${escapeHtml(date)}</span>
			<a class="arrow" href="/?date=${escapeHtml(nextDate)}">&#8594;</a>
		</div>
		<section class="grid">${cards}</section>
	</main>
</body>
</html>`;
}

function GamePage({ away, home, awayScore, homeScore, stateLabel, statusMessage, plays, backDate }) {
	const playsJson = escapeJsonForScriptTag(plays);

	return `<!doctype html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>NHL - Match ${escapeHtml(away)} vs ${escapeHtml(home)}</title>
	<link rel="stylesheet" href="/public/teams.css">
</head>
<body class="game-page">
	<main class="page-shell page-shell--wide">
		<div class="panel">
			<a href="/?date=${escapeHtml(backDate)}">Retour aux matchs</a>
			<h1>${escapeHtml(away)} vs ${escapeHtml(home)}</h1>
			<p class="score score--large">${escapeHtml(String(awayScore))} - ${escapeHtml(String(homeScore))}</p>
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
			} catch (error) {
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
					.map((player) => player.role + ": #" + player.number + " " + player.name + " (" + player.team + ")")
					.join(" | ");
			}

			function isSeparatorType(type) {
				const eventType = String(type || "").toLowerCase();
				return eventType === "stoppage" || eventType === "period-start" || eventType === "period-end";
			}

			function isPeriodEndType(type) {
				return String(type || "").toLowerCase() === "period-end";
			}

			function appendBatch() {
				const end = Math.min(index + batchSize, plays.length);
				for (let i = index; i < end; i += 1) {
					const play = plays[i];

					if (isSeparatorType(play.type)) {
						const separatorRow = document.createElement("tr");
						separatorRow.className = "separator-row";
						const separatorCell = document.createElement("td");
						separatorCell.colSpan = 6;
						const typeLabel = String(play.type || "event").replaceAll("-", " ").toUpperCase();
						const desc = String(play.description || "");
						separatorCell.textContent =
							typeLabel + " | P" + String(play.period ?? "-") + " | " + (play.timeInPeriod || "--:--") + (desc ? " | " + desc : "");
						separatorRow.appendChild(separatorCell);
						body.appendChild(separatorRow);

						if (isPeriodEndType(play.type)) {
							const spacerRow = document.createElement("tr");
							spacerRow.className = "spacer-row";
							const spacerCell = document.createElement("td");
							spacerCell.colSpan = 6;
							spacerRow.appendChild(spacerCell);
							body.appendChild(spacerRow);
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
						chip.className = "team-badge " + teamClass;
						chip.textContent = teamValue;
						tdTeam.appendChild(chip);
					}
					tr.appendChild(tdTeam);

					const tdPlayers = document.createElement("td");
					tdPlayers.textContent = playersText(play.players);
					tr.appendChild(tdPlayers);

					const tdDescription = document.createElement("td");
					tdDescription.textContent = play.penaltyInfo || String(play.description || "");
					tr.appendChild(tdDescription);

					body.appendChild(tr);
				}

				index = end;
				sentinel.textContent =
					index >= plays.length
						? "Toutes les actions sont affichees (" + plays.length + ")."
						: "Actions affichees: " + index + "/" + plays.length;
			}

			appendBatch();

			const observer = new IntersectionObserver((entries) => {
				if (entries.some((entry) => entry.isIntersecting) && index < plays.length) {
					appendBatch();
				}
			});

			observer.observe(sentinel);
		})();
	</script>
</body>
</html>`;
}

function ErrorPage({ title, message, backHref = "/" }) {
	return `<!doctype html>
<html lang="fr">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${escapeHtml(title)}</title>
	<link rel="stylesheet" href="/public/teams.css">
</head>
<body class="error-page">
	<main class="page-shell page-shell--narrow">
		<div class="panel panel--error">
			<h1>${escapeHtml(title)}</h1>
			<p>${escapeHtml(message)}</p>
			<p><a href="${escapeHtml(backHref)}">Retour</a></p>
		</div>
	</main>
</body>
</html>`;
}

module.exports = {
	HomePage,
	GamePage,
	ErrorPage,
};