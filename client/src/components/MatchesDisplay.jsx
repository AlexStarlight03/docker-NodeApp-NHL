export default function MatchesDisplay({
  date,
  matches,
  favoriteCodes,
  loading,
  onPreviousDay,
  onToday,
  onNextDay,
  showFavoritesOnly,
  onToggleFavoritesFilter,
  onSelectMatch,
}) {
  const displayMatches = showFavoritesOnly
    ? matches.filter((game) => favoriteCodes.includes(game.away) || favoriteCodes.includes(game.home))
    : matches;

  return (
    <div className="matches-display">
      <div className="matches-header">
        <h2>
          {showFavoritesOnly ? "Matchs de tes équipes" : "Tous les matchs"} ({date || "N/A"})
        </h2>
        <button
          className="toggle-button"
          onClick={onToggleFavoritesFilter}
          title={showFavoritesOnly ? "Voir tous les matchs" : "Voir mes équipes seulement"}
        >
          {showFavoritesOnly ? "📌 Mes équipes" : "🏒 Tous les matchs"}
        </button>
      </div>

      <div className="date-navigation">
        <button onClick={onPreviousDay} disabled={loading}>
          ← Jour précédent
        </button>
        <button onClick={onToday} disabled={loading}>
          Aujourd'hui
        </button>
        <button onClick={onNextDay} disabled={loading}>
          Jour suivant →
        </button>
      </div>

      {loading && <p className="loading">Chargement des matchs...</p>}

      {!loading && displayMatches.length === 0 && (
        <p className="empty-state">
          {showFavoritesOnly
            ? "Aucun match pour tes équipes favorites cette journée."
            : "Aucun match programmé pour cette journée."}
        </p>
      )}

      {!loading && displayMatches.length > 0 && (
        <ul className="matches-list">
          {displayMatches.map((game) => {
            const isFavoriteGame = favoriteCodes.includes(game.away) || favoriteCodes.includes(game.home);
            const statusClass =
              game.state === "FINAL"
                ? "final"
                : game.state === "LIVE"
                ? "live"
                : "scheduled";

            return (
              <li
                key={game.id}
                className={`match-card ${statusClass} ${isFavoriteGame ? "favorite-match" : ""}`}
                onClick={() => onSelectMatch(game.id)}
                style={{ cursor: "pointer" }}
              >
                <div className="match-teams">
                  <div className={`team away ${isFavoriteGame && favoriteCodes.includes(game.away) ? "highlighted" : ""}`}>
                    <strong>{game.away}</strong>
                    <span className="score">{game.awayScore}</span>
                  </div>
                  <div className="vs">VS</div>
                  <div className={`team home ${isFavoriteGame && favoriteCodes.includes(game.home) ? "highlighted" : ""}`}>
                    <strong>{game.home}</strong>
                    <span className="score">{game.homeScore}</span>
                  </div>
                </div>
                <div className="match-details">
                  <span className={`status ${statusClass}`}>{game.state}</span>
                  <span className="time">{new Date(game.startTimeUTC).toLocaleString("fr-CA")}</span>
                  <span className="venue">{game.venue}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
