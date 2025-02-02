import "dotenv/config"  
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

import { WebSocketManager } from "./WebSocketManager";
import { attachGracefulShutdownHandler } from "./shutdown";

const PORT = process.env.PORT || 3000;
const DEFAULT_FE_RELATIVE_LOCATION = "front-end/dist";
const FE_ABSOLUTE_LOCATION = process.env.FE_LOCATION || path.join(path.dirname(fileURLToPath(import.meta.url)), "../..", DEFAULT_FE_RELATIVE_LOCATION);

const app = express();
const server = http.createServer(app);
const wsManager = WebSocketManager.attach(server);

// TODO check this
attachGracefulShutdownHandler(wsManager, server);

app.use(express.static(FE_ABSOLUTE_LOCATION));
app.get('*', (_, res) => {
  res.sendFile(path.join(FE_ABSOLUTE_LOCATION, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server is running of port ${PORT}`);
});
