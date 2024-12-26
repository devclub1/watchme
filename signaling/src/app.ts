import express from "express";
import http from "http";

import { WebSocketManager } from "./WebSocketManager";

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

app.use(express.static("../clients"));

WebSocketManager.attach(server);

server.listen(PORT, () => {
  console.log(`Server is running o port ${PORT}`);
});
