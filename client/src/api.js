const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erreur API");
  }

  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getTeams: (token) => request("/teams", {}, token),
  getFavorites: (token) => request("/favorites", {}, token),
  addFavorite: (token, teamCode) => request("/favorites", { method: "POST", body: JSON.stringify({ teamCode }) }, token),
  removeFavorite: (token, id) => request(`/favorites/${id}`, { method: "DELETE" }, token),
  getFavoriteMatches: (token) => request("/favorites/matches/today", {}, token),
  getMatches: (token, date) => request(`/matches/${date}`, {}, token),
  getPlayByPlay: (token, gameId) => request(`/matches/${gameId}/play-by-play`, {}, token),
};
