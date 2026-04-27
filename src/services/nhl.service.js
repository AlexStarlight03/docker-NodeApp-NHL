const API_BASE = "https://api-web.nhle.com/v1";

async function fetchJson(url) {
	const response = await fetch(url, { headers: { Accept: "application/json" } });
	if (!response.ok) {
		throw new Error(`NHL API error ${response.status} for ${url}`);
	}
	return response.json();
}

function gameStateLabel(gameState) {
	const state = String(gameState || "").toUpperCase();
	if (["LIVE", "CRIT"].includes(state)) {return "En cours";}

	if (["FINAL", "OFF"].includes(state)) {return "Terminé";}

	if (["FUT", "PRE", "SCHED"].includes(state)) {return "Non débuté";}

	if (["POST", "PST", "CANC", "CNCL"].includes(state)) {return "Annulé";}

	if (["MOVED", "MV", "RESCH", "RSCH"].includes(state)) {return "Déplacé";}

	return state || "-";
}

function mapTodayGames(payload, date) {
	if (!payload || !Array.isArray(payload.gameWeek)) {
		return [];
	}

	const day = payload.gameWeek.find((entry) => entry.date === date);
	if (!day || !Array.isArray(day.games)) {
		return [];
	}

	return day.games.map((game) => ({
		id: game.id,
		awayName: game.awayTeam?.commonName?.default || game.awayTeam?.abbrev || "N/A",
		homeName: game.homeTeam?.commonName?.default || game.homeTeam?.abbrev || "N/A",
		awayScore: game.awayTeam?.score ?? "-",
		homeScore: game.homeTeam?.score ?? "-",
		stateRaw: game.gameState || "",
		stateLabel: gameStateLabel(game.gameState),
		startTimeUTC: game.startTimeUTC,
		venue: game.venue?.default || "N/A",
	}));
}

async function getGamesByDate(date) {
	const payload = await fetchJson(`${API_BASE}/schedule/${date}`);
	return { date, games: mapTodayGames(payload, date) };
}

async function getGamePlayById(gameId) {
	return fetchJson(`${API_BASE}/gamecenter/${gameId}/play-by-play`);
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
		for (const player of payload.rosterSpots) {
			const first = player.firstName?.default || "";
			const last = player.lastName?.default || "";
			const fullName = `${first} ${last}`.trim() || `#${player.playerId}`;
			playerById.set(player.playerId, {
				name: fullName,
				number: player.sweaterNumber ?? "?",
				team: teamLabelById.get(player.teamId) || "N/A",
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

			const player = playerById.get(playerId);
			const role = key
				.replace(/PlayerId$/i, "")
				.replace(/([A-Z])/g, " $1")
				.trim()
				.toLowerCase();

			refs.push({
				role,
				playerId,
				name: player?.name || `Joueur ${playerId}`,
				number: player?.number ?? "?",
				team: player?.team || "N/A",
			});
		}

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

	function formatEventDescription(type, details) {
		if (!details || typeof details !== "object") {
			return "";
		}

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

module.exports = {
	fetchJson,
	gameStateLabel,
	getGamesByDate,
	getGamePlayById,
	hasStarted,
	mapPlays,
};