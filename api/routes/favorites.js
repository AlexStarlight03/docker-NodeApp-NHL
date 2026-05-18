const express = require("express");
const FavoriteTeam = require("../models/FavoriteTeam");
const authRequired = require("../middleware/auth");

const router = express.Router();

const NHL_TEAMS = [
  { code: "ANA", name: "Anaheim Ducks" },
  { code: "BOS", name: "Boston Bruins" },
  { code: "BUF", name: "Buffalo Sabres" },
  { code: "CGY", name: "Calgary Flames" },
  { code: "CAR", name: "Carolina Hurricanes" },
  { code: "CHI", name: "Chicago Blackhawks" },
  { code: "COL", name: "Colorado Avalanche" },
  { code: "CBJ", name: "Columbus Blue Jackets" },
  { code: "DAL", name: "Dallas Stars" },
  { code: "DET", name: "Detroit Red Wings" },
  { code: "EDM", name: "Edmonton Oilers" },
  { code: "FLA", name: "Florida Panthers" },
  { code: "LAK", name: "Los Angeles Kings" },
  { code: "MIN", name: "Minnesota Wild" },
  { code: "MTL", name: "Montreal Canadiens" },
  { code: "NSH", name: "Nashville Predators" },
  { code: "NJD", name: "New Jersey Devils" },
  { code: "NYI", name: "New York Islanders" },
  { code: "NYR", name: "New York Rangers" },
  { code: "OTT", name: "Ottawa Senators" },
  { code: "PHI", name: "Philadelphia Flyers" },
  { code: "PIT", name: "Pittsburgh Penguins" },
  { code: "SEA", name: "Seattle Kraken" },
  { code: "SJS", name: "San Jose Sharks" },
  { code: "STL", name: "St. Louis Blues" },
  { code: "TBL", name: "Tampa Bay Lightning" },
  { code: "TOR", name: "Toronto Maple Leafs" },
  { code: "UTA", name: "Utah Hockey Club" },
  { code: "VAN", name: "Vancouver Canucks" },
  { code: "VGK", name: "Vegas Golden Knights" },
  { code: "WSH", name: "Washington Capitals" },
  { code: "WPG", name: "Winnipeg Jets" }
];

function findTeamByCode(code) {
  return NHL_TEAMS.find((team) => team.code === code);
}

router.get("/teams", authRequired, (_req, res) => {
  res.json(NHL_TEAMS);
});

router.get("/favorites", authRequired, async (req, res) => {
  const favorites = await FavoriteTeam.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(favorites);
});

router.post("/favorites", authRequired, async (req, res) => {
  const teamCode = String(req.body.teamCode || "").trim().toUpperCase();
  const team = findTeamByCode(teamCode);

  if (!team) {
    return res.status(400).json({ error: "Equipe invalide" });
  }

  try {
    const favorite = await FavoriteTeam.create({
      userId: req.user.id,
      teamCode: team.code,
      teamName: team.name,
    });
    return res.status(201).json(favorite);
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ error: "Equipe deja en favoris" });
    }
    throw error;
  }
});

router.put("/favorites/:id", authRequired, async (req, res) => {
  const teamCode = String(req.body.teamCode || "").trim().toUpperCase();
  const team = findTeamByCode(teamCode);

  if (!team) {
    return res.status(400).json({ error: "Equipe invalide" });
  }

  try {
    const updated = await FavoriteTeam.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
      },
      {
        teamCode: team.code,
        teamName: team.name,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({ error: "Favori introuvable" });
    }

    return res.json(updated);
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ error: "Equipe deja en favoris" });
    }
    throw error;
  }
});

router.delete("/favorites/:id", authRequired, async (req, res) => {
  const removed = await FavoriteTeam.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!removed) {
    return res.status(404).json({ error: "Favori introuvable" });
  }

  return res.status(204).send();
});

router.get("/favorites/matches/today", authRequired, async (req, res) => {
  const favorites = await FavoriteTeam.find({ userId: req.user.id });
  const codes = favorites.map((f) => f.teamCode);

  if (codes.length === 0) {
    return res.json({ date: new Date().toISOString().slice(0, 10), games: [] });
  }

  const date = new Date().toISOString().slice(0, 10);
  const response = await fetch(`https://api-web.nhle.com/v1/schedule/${date}`);
  const payload = await response.json();
  const day = Array.isArray(payload.gameWeek)
    ? payload.gameWeek.find((d) => d.date === date)
    : null;
  const games = Array.isArray(day?.games) ? day.games : [];

  const filtered = games
    .filter((game) => {
      const away = game.awayTeam?.abbrev;
      const home = game.homeTeam?.abbrev;
      return codes.includes(away) || codes.includes(home);
    })
    .map((game) => ({
      id: game.id,
      away: game.awayTeam?.abbrev,
      home: game.homeTeam?.abbrev,
      awayScore: game.awayTeam?.score ?? "-",
      homeScore: game.homeTeam?.score ?? "-",
      state: game.gameState || "SCHED",
      startTimeUTC: game.startTimeUTC,
      venue: game.venue?.default || "N/A",
    }));

  return res.json({ date, games: filtered });
});

router.get("/matches/:date", authRequired, async (req, res) => {
  const date = req.params.date;

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Format de date invalide (YYYY-MM-DD)" });
  }

  try {
    const response = await fetch(`https://api-web.nhle.com/v1/schedule/${date}`);
    const payload = await response.json();
    const day = Array.isArray(payload.gameWeek)
      ? payload.gameWeek.find((d) => d.date === date)
      : null;
    const games = Array.isArray(day?.games) ? day.games : [];

    const mapped = games.map((game) => ({
      id: game.id,
      away: game.awayTeam?.abbrev,
      home: game.homeTeam?.abbrev,
      awayScore: game.awayTeam?.score ?? "-",
      homeScore: game.homeTeam?.score ?? "-",
      state: game.gameState || "SCHED",
      startTimeUTC: game.startTimeUTC,
      venue: game.venue?.default || "N/A",
    }));

    return res.json({ date, games: mapped });
  } catch (error) {
    return res.status(500).json({ error: "Erreur lors de la recuperation des matchs" });
  }
});

router.get("/matches/:gameId/play-by-play", authRequired, async (req, res) => {
  const gameId = String(req.params.gameId || "").trim();

  if (!/^\d+$/.test(gameId)) {
    return res.status(400).json({ error: "ID de match invalide" });
  }

  try {
    const response = await fetch(`https://api-web.nhle.com/v1/gamecenter/${gameId}/play-by-play`);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Erreur NHL API" });
    }

    const data = await response.json();

    const homeTeamId = data.homeTeam?.id;
    const awayTeamId = data.awayTeam?.id;
    const teamLabelById = new Map([
      [homeTeamId, data.homeTeam?.abbrev || "HOME"],
      [awayTeamId, data.awayTeam?.abbrev || "AWAY"],
    ]);

    const playerById = new Map();
    if (Array.isArray(data.rosterSpots)) {
      for (const player of data.rosterSpots) {
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

    function playerRefsFromDetails(details) {
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

    const plays = Array.isArray(data.plays)
      ? data.plays.map((play) => ({
          period: play.periodDescriptor?.number ?? "-",
          timeInPeriod: play.timeInPeriod || "--:--",
          type: play.typeDescKey || "",
          team: teamLabelById.get(play.details?.eventOwnerTeamId) || "N/A",
          penaltyInfo: formatPenaltyInfo(play.typeDescKey, play.details),
          description: play.details?.reason || play.details?.descKey || "",
          players: playerRefsFromDetails(play.details),
        }))
      : [];

    return res.json({
      gameId,
      away: data.awayTeam?.abbrev || "AWAY",
      home: data.homeTeam?.abbrev || "HOME",
      awayScore: data.awayTeam?.score ?? "-",
      homeScore: data.homeTeam?.score ?? "-",
      state: data.gameState || "SCHED",
      plays,
    });
  } catch (error) {
    return res.status(502).json({ error: "Erreur lors de la recuperation du match" });
  }
});

module.exports = router;
