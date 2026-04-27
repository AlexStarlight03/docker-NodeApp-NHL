# NHL Game Updates — Mini application Node.js

Petit projet Node.js qui affiche les matchs NHL d'une journée donnée et le play-by-play.

Port utilisé: 80

Prérequis:

- Docker installé

Pour obtenir l'image :

```bash
docker pull alexstarlight03/nhlgameupdates:v1.0
```

Construire et lancer le projet :

```bash
docker run -d --name nhlgameupdates -p 8080:80 alexstarlight03/nhlgameupdates:v1.0
```

Pour utiliser l'application localement:

Rendez-vous sur http://localhost:8080
