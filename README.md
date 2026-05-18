# TP3 Docker Compose - NHL Tracker (Client + API + MongoDB + nginx)

## Description du projet

Cette application permet de suivre des equipes NHL preferees par utilisateur :

- creation de compte et connexion ;
- gestion CRUD des equipes favorites ;
- affichage des matchs du jour lies aux equipes favorites.

Le projet est concu pour fonctionner avec plusieurs services Docker en developpement et en production.

## Architecture

- client : application React avec Vite
- api : API Node.js avec Express
- database : MongoDB avec volume persistant
- nginx : reverse proxy et serveur web en production

Flux cible :

Navigateur -> nginx -> client React + /api vers API -> MongoDB

## Structure du projet

```text
.
├── client/
├── api/
├── nginx/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

## Variables d'environnement

Copier `.env.example` vers `.env` et ajuster les valeurs si necessaire.

Variables minimales :

- `PORT=5000`
- `MONGO_URL=mongodb://database:27017/tp3`
- `JWT_SECRET=change_this_secret`
- `VITE_API_URL=http://localhost:5000/api` (utile surtout en dev)

## Lancement en developpement

Commande :

```bash
docker compose up --build
```

Acces :

- React direct : `http://localhost:5173`
- API direct : `http://localhost:5000/api/health`
- nginx dev (proxy) : `http://localhost`

Le mode dev utilise des bind mounts pour le live reload (client + api).

## Lancement en production

Commande recommandee :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

En production :

- le client est build et servi par nginx ;
- les requetes `/api` passent par nginx vers le service API ;
- la base conserve les donnees via le volume nomme `database_data` ;
- les services internes ne sont pas exposes inutilement.

## Routes de l'API

Routes minimales TP :

- `GET /api/health`
- `GET /api/items`
- `POST /api/items`

Routes ajoutees (comptes + favoris) :

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/teams`
- `GET /api/favorites`
- `POST /api/favorites`
- `PUT /api/favorites/:id`
- `DELETE /api/favorites/:id`
- `GET /api/favorites/matches/today`

## Commandes utiles

```bash
docker compose up --build
docker compose down
docker compose down -v
docker compose ps
docker compose logs
docker compose logs -f
docker compose up api
docker compose exec api sh
```

## Probleme rencontre et solution

Probleme : en frontend, utiliser `http://api:5000` ne fonctionne pas depuis le navigateur car `api` est un nom DNS interne Docker.

Solution :

- en developpement, utiliser `VITE_API_URL=http://localhost:5000/api` ;
- en production, utiliser une URL relative (`/api`) pour que nginx route vers l'API.

## Bonnes pratiques appliquees

- variables sensibles externalisees ;
- fichier `.env.example` fourni ;
- `node_modules`, `.env`, `dist`, `build` ignores ;
- volume nomme pour la persistence MongoDB ;
- separation dev/prod avec deux fichiers Compose.
