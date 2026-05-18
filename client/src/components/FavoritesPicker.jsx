export default function FavoritesPicker({
  teams,
  favorites,
  selectedTeam,
  onSelectTeam,
  onAddFavorite,
  onRemoveFavorite,
  loading,
  error,
}) {
  return (
    <div className="favorites-picker">
      <h2>Mes équipes favorites</h2>
      
      <div className="add-favorite-section">
        <p>Ajoute tes équipes préférées pour suivre leurs matchs</p>
        <div className="row">
          <select value={selectedTeam} onChange={(e) => onSelectTeam(e.target.value)}>
            <option value="">-- Sélectionne une équipe --</option>
            {teams.map((team) => (
              <option key={team.code} value={team.code}>
                {team.code} - {team.name}
              </option>
            ))}
          </select>
          <button onClick={onAddFavorite} disabled={!selectedTeam || loading}>
            {loading ? "Ajout..." : "Ajouter"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="favorites-list">
        <h3>{favorites.length} équipe(s) sélectionnée(s)</h3>
        {favorites.length === 0 ? (
          <p className="empty-state">Aucune équipe favorite pour le moment. Ajoute-en une pour commencer!</p>
        ) : (
          <ul>
            {favorites.map((favorite) => (
              <li key={favorite._id} className="favorite-item">
                <div className="favorite-info">
                  <strong>{favorite.teamCode}</strong>
                  <span>{favorite.teamName}</span>
                </div>
                <button
                  className="danger"
                  onClick={() => onRemoveFavorite(favorite._id)}
                  disabled={loading}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
