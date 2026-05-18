import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import AuthForm from "./components/AuthForm";
import FavoritesPicker from "./components/FavoritesPicker";
import MatchesDisplay from "./components/MatchesDisplay";
import MatchDetail from "./components/MatchDetail";

const TOKEN_KEY = "tp3_token";

export default function App() {
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [matches, setMatches] = useState([]);
  const [date, setDate] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(true);
  const [gameData, setGameData] = useState(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");

  const favoriteCodes = useMemo(() => favorites.map((f) => f.teamCode), [favorites]);

  function getDateString(d) {
    return d.toISOString().slice(0, 10);
  }

  async function loadDashboard(jwt, targetDate = null) {
    setLoading(true);
    setError("");

    try {
      const displayDate = targetDate || getDateString(new Date());
      const [teamList, favoriteList, matchPayload] = await Promise.all([
        api.getTeams(jwt),
        api.getFavorites(jwt),
        api.getMatches(jwt, displayDate),
      ]);

      setTeams(teamList);
      setFavorites(favoriteList);
      setMatches(matchPayload.games || []);
      setDate(matchPayload.date || "");
      setSelectedTeam((previous) => previous || teamList[0]?.code || "");
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("token")) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadDashboard(token);
    }
  }, [token]);

  function saveToken(nextToken) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setTeams([]);
    setFavorites([]);
    setMatches([]);
    setDate("");
  }

  async function handleAuth(payload) {
    setAuthLoading(true);
    setError("");

    try {
      const response = mode === "login" ? await api.login(payload) : await api.register(payload);
      saveToken(response.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function addFavorite() {
    if (!selectedTeam || !token) {
      return;
    }

    try {
      await api.addFavorite(token, selectedTeam);
      await loadDashboard(token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeFavorite(id) {
    try {
      await api.removeFavorite(token, id);
      await loadDashboard(token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePreviousDay() {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() - 1);
    await loadDashboard(token, getDateString(currentDate));
  }

  async function handleToday() {
    await loadDashboard(token);
  }

  async function handleNextDay() {
    const currentDate = new Date(date);
    currentDate.setDate(currentDate.getDate() + 1);
    await loadDashboard(token, getDateString(currentDate));
  }

  async function handleSelectMatch(gameId) {
    setCurrentPage("match-detail");
    setGameLoading(true);
    setGameError("");

    try {
      const data = await api.getPlayByPlay(token, gameId);
      setGameData(data);
    } catch (err) {
      setGameError(err.message);
    } finally {
      setGameLoading(false);
    }
  }

  function handleBackFromMatchDetail() {
    setCurrentPage("dashboard");
    setGameData(null);
    setGameError("");
  }

  if (!token) {
    return (
      <main className="layout">
        <header>
          <h1>NHL Tracker</h1>
          <p>Connecte-toi pour suivre tes equipes favorites et leurs matchs.</p>
        </header>
        {error && <p className="error">{error}</p>}
        <AuthForm mode={mode} onSubmit={handleAuth} loading={authLoading} />
        <button className="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Pas de compte ? Cree-en un" : "Deja un compte ? Se connecter"}
        </button>
      </main>
    );
  }

  return (
    <main className="layout">
      <header className="app-header">
        <div className="header-content">
          <h1>NHL Tracker</h1>
          <p>Suis les matchs de tes equipes favorites</p>
        </div>
        <nav className="header-nav">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className={`nav-button ${currentPage === "dashboard" ? "active" : ""}`}
          >
            🏒 Matchs
          </button>
          <button
            onClick={() => setCurrentPage("favorites")}
            className={`nav-button ${currentPage === "favorites" ? "active" : ""}`}
          >
            ⭐ Mes equipes
          </button>
          <button onClick={logout} className="nav-button logout">
            Deconnexion
          </button>
        </nav>
      </header>

      {error && <p className="error">{error}</p>}

      {currentPage === "dashboard" && (
        <section className="card">
          <MatchesDisplay
            date={date}
            matches={matches}
            favoriteCodes={favoriteCodes}
            loading={loading}
            onPreviousDay={handlePreviousDay}
            onToday={handleToday}
            onNextDay={handleNextDay}
            showFavoritesOnly={showFavoritesOnly}
            onToggleFavoritesFilter={() => setShowFavoritesOnly(!showFavoritesOnly)}
            onSelectMatch={handleSelectMatch}
          />
        </section>
      )}

      {currentPage === "favorites" && (
        <section className="card">
          <FavoritesPicker
            teams={teams}
            favorites={favorites}
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
            onAddFavorite={addFavorite}
            onRemoveFavorite={removeFavorite}
            loading={loading}
            error={error}
          />
        </section>
      )}

      {currentPage === "match-detail" && (
        <section className="card">
          <MatchDetail
            gameData={gameData}
            loading={gameLoading}
            error={gameError}
            onBack={handleBackFromMatchDetail}
          />
        </section>
      )}
    </main>
  );
}
