import {WebSocketManager} from "./WebSocketManager";
import http from "http";

export const attachGracefulShutdownHandler = (wsManager: WebSocketManager, server: http.Server) => {
    process.on("SIGINT", () => {
        WebSocketManager.detach(wsManager, () => {
            server.close(() => {
                console.log("process gracefully terminated");
                process.exit(0);
            })
        })
    });
};