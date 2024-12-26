import express from "express";
import http from "http";

import { WebSocketManager } from "./WebSocketManager";

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

app.use(express.static("../clients"));

const webSocketManager = new WebSocketManager(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { app };