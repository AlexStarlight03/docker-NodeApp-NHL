import { useState } from "react";

export default function AuthForm({ onSubmit, mode = "login", loading }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event) => {
    event.preventDefault();
    onSubmit({ username, password });
  };

  return (
    <form className="card" onSubmit={submit}>
      <h2>{mode === "login" ? "Connexion" : "Inscription"}</h2>
      <label>
        Nom d'utilisateur
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          required
        />
      </label>
      <label>
        Mot de passe
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />
      </label>
      <button disabled={loading} type="submit">
        {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "Creer un compte"}
      </button>
    </form>
  );
}
