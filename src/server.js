const app = require("./app");

const port = 80;

app.listen(port, () => {
	console.log(`Serveur NHL lance sur le port ${port}`);
});