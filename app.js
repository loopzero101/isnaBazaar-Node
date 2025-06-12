const http = require("http");
const https = require("https");
const express = require("express");
const fs = require("fs");
const cron = require("node-cron");

const appConfig = require("./config/app");
const routes = require("./routes/routes");
const db = require("./models/index");
const cornJob = require("./utils/cornJob");

class Server {
	constructor() {
		this.app = express();
		this.io = require("socket.io")();
		db.sequelize
			.sync()
			.then(() => {
				console.log("Synced db.");
			})
			.catch((err) => {
				console.log("Failed to sync db: " + err);
			});
	}

	appConfig() {
		new appConfig(this.app, this.io).includeConfig();
	}

	includeRoute() {
		new routes(this.app).routesConfig();
	}

	async appExecute() {
		var port = process.env.PORT || 8000;
		var ssl = process.env.SSL || "inactive";
		var ssl_key_path = process.env.SSL_KEY || null;
		var ssl_cert_path = process.env.SSL_CERT || null;
		var server = null;

		this.appConfig();
		this.includeRoute();

		if (ssl == "active") {
			let options = {
				key: fs.readFileSync(ssl_key_path),
				cert: fs.readFileSync(ssl_cert_path)
			};
			server = https.createServer(options, this.app);
		} else {
			server = http.createServer(this.app);
		}

		server.listen(port);
		if (server.listening) {
			console.log(`ISNA server is listening on this ${port}`);
		}

		this.io.on("connection", function (socket) {
			console.log(socket.id);
		});
		this.io.listen(server);

		if (process.env.CORN_JOB == "true") {
			cron.schedule("* * * * *", () => {
				cornJob.checkBoothStatus();
			});
		}
	}
}

const app = new Server();
app.appExecute();
