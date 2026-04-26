docker build -t nodefix .
docker run -d --name appnode -p 8080:80 nodefix

ce rendre sur localhost:8080
