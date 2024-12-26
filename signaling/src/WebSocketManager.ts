import { Server, Socket } from "socket.io";

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
  hello: () => void;
}

interface InterServerEvents {
}

interface SocketData {
}

class WebSocketManager {
    #io: Server;
    #rooms: string[];

    constructor() {
      this.#io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>();
      this.#rooms = [];

      this.initializeHandlers();
    }

  initializeHandlers() {
    this.#io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {

      console.log("New client connected:", socket.id);
    });
  }
}
