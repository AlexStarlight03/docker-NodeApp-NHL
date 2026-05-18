# TP3 Docker Compose - NHL Tracker (Client + API + MongoDB + nginx)

## Description du projet

Cette application de voir les matchs de la LNH pour une journée spécifique et permet de facilement voir les matchs de vos équipes préférées:

- création de compte et connexion
- gestion CRUD des équipes favorites
- affichage des matchs du jour pour soit toutes les équipes ou seulement les équipes favorites.
- affichage des matchs avec le play-by-play par période en ordre chronologique.

## Architecture

- client : application React avec Vite
- api : API Node.js avec Express
- database : MongoDB avec volume persistant
- nginx : reverse proxy et serveur web en production

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

## Lancement en développement

Commande :

```bash
docker compose up --build
```

## Lancement en production

Commande recommandee :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

## Variables d'environnement

Copier `.env.example` vers `.env` et ajuster les valeurs si nécessaire.

Variables minimales :

- `PORT=5000`
- `MONGO_URL=mongodb://database:27017/tp3`
- `JWT_SECRET=change_this_secret`
- `VITE_API_URL=http://localhost:5000/api` (utile surtout en dev)


## Routes de l'API

- `POST /api/auth/register` pour créer un nouveau compte
- `POST /api/auth/login` pour se connecter à un compte existant
- `GET /api/teams`  obtenir toutes les équipes de la LNH
- `GET /api/favorites`  obtenir la liste des favoris de l'utilisateur
- `POST /api/favorites`  ajouter une équipe aux favoris de l'utilisateur connecté
- `PUT /api/favorites/:id` remplace une équipe favorite de l'utilisateur connecté
- `DELETE /api/favorites/:id` enlever une équipe des favoris de l'utilisateur connecté
- `GET /api/favorites/matches/today` obtenir la liste des matchs des équipes favorites pour la journée actuelle
- `GET api/matches/:gameId/play-by-play` obtenir le play-by-play d'un match spécifique
- `GET api/matches/:date` obtenir tous les matchs pour une date donnée

## Problème rencontré

À partir de mon arborescence de fichier, comment monter ce projet pour bien le séparer en différents services. Le début de ce projet a été le plus difficile, relire mon code et réfléchir à quelle place chaque fonction aurait plus sa place. Au final, relire les notes de cours et les exercices d'exemple m'ont aidés et quand je regarde ce TP3 l'arborescence me semble simple et logique grâce à ma meilleure compréhension comparé au début du projet.

