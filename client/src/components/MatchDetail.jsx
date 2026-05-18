import { useEffect, useRef, useState } from "react";

export default function MatchDetail({
  gameData,
  loading,
  error,
  onBack,
}) {
  const [displayedPlays, setDisplayedPlays] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const sentinelRef = useRef(null);

  const BATCH_SIZE = 40;

  useEffect(() => {
    if (!gameData?.plays || gameData.plays.length === 0) {
      return;
    }

    // Load initial batch
    const firstBatch = gameData.plays.slice(0, BATCH_SIZE);
    setDisplayedPlays(firstBatch);
    setLoadedCount(Math.min(BATCH_SIZE, gameData.plays.length));
  }, [gameData]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !gameData?.plays) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && loadedCount < gameData.plays.length) {
        const newCount = Math.min(loadedCount + BATCH_SIZE, gameData.plays.length);
        setDisplayedPlays(gameData.plays.slice(0, newCount));
        setLoadedCount(newCount);
      }
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadedCount, gameData]);

  function isGoalType(type) {
    const eventType = String(type || "").toLowerCase();
    return eventType === "goal";
  }

  function isSeparatorType(type) {
    const eventType = String(type || "").toLowerCase();
    return eventType === "stoppage" || eventType === "period-start" || eventType === "period-end";
  }

  function isPeriodEndType(type) {
    return String(type || "").toLowerCase() === "period-end";
  }

  function playersText(players) {
    if (!Array.isArray(players) || players.length === 0) {
      return "";
    }
    return players
      .map((player) => `${player.role}: #${player.number} ${player.name} (${player.team})`)
      .join(" | ");
  }

  if (loading) {
    return (
      <div className="match-detail">
        <button onClick={onBack} className="back-button">← Retour</button>
        <p className="loading">Chargement des détails du match...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-detail">
        <button onClick={onBack} className="back-button">← Retour</button>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="match-detail">
        <button onClick={onBack} className="back-button">← Retour</button>
        <p className="error">Aucune donnée disponible</p>
      </div>
    );
  }

  const { away, home, awayScore, homeScore, state, plays } = gameData;
  const hasStarted = ["LIVE", "CRIT", "FINAL", "OFF"].includes(String(state || "").toUpperCase());

  return (
    <div className="match-detail">
      <button onClick={onBack} className="back-button">← Retour</button>

      <div className="match-detail-header">
        <h1>{away} vs {home}</h1>
        <p className="score-large">{awayScore} - {homeScore}</p>
        <p className="match-status">Statut : {state}</p>
      </div>

      <div className="match-detail-plays">
        <h2>{hasStarted ? "Récapitulatif jeu par jeu" : "Le match n'a pas commencé"}</h2>

        {!hasStarted && (
          <p className="info-message">
            Les actions seront disponibles une fois le match débuté.
          </p>
        )}

        {plays.length === 0 && hasStarted && (
          <p className="info-message">Aucune action enregistrée pour le moment.</p>
        )}

        {plays.length > 0 && (
          <>
            <table className="plays-table">
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
              <tbody>
                {displayedPlays.map((play, index) => {
                  if (isSeparatorType(play.type)) {
                    const typeLabel = String(play.type || "event")
                      .replaceAll("-", " ")
                      .toUpperCase();
                    const desc = String(play.description || "");
                    const separatorText = `${typeLabel} | P${String(play.period ?? "-")} | ${play.timeInPeriod || "--:--"}${
                      desc ? " | " + desc : ""
                    }`;

                    return (
                      <tr key={index} className="separator-row">
                        <td colSpan="6">{separatorText}</td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={index} className={`play-row ${isGoalType(play.type) ? `goal-row team-${String(play.team).toUpperCase()}` : ""}`}>
                      <td>{play.period ?? "-"}</td>
                      <td>{play.timeInPeriod || "--:--"}</td>
                      <td>{play.type || "event"}</td>
                      <td>
                        {play.team && String(play.team).toUpperCase() !== "N/A" && (
                          <span className={`team-badge team-${String(play.team).toUpperCase()}`}>
                            {String(play.team).toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td>{playersText(play.players)}</td>
                      <td>{play.penaltyInfo || String(play.description || "")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="scroll-sentinel" ref={sentinelRef}>
              {loadedCount >= plays.length
                ? `Toutes les actions sont affichées (${plays.length}).`
                : `Actions affichées: ${loadedCount}/${plays.length}`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
