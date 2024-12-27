import { Server, Socket } from "socket.io";
import validator from "validator";
import http from "http";

interface JoinMessage {
  channel: string;
  type: 'sharer' | 'viewer';
}

interface WebRTCPayload {
  target: string;
  channel: string;
  offer?: RTCSessionDescription;
  from?: string;
}

interface ICEPayload {
  from: string;
  to: string;
  candidate: RTCIceCandidate;
}

interface ClientEvent {
  "join-channel": (joinMessage: JoinMessage) => void;
  "webrtc-offer": (payload: WebRTCPayload) => void;
  "webrtc-answer": (payload: WebRTCPayload) => void;
  "ice-candidate": (payload: ICEPayload) => void;
  "disconnect": () => void;
}

interface ServerEvent {
  "no-channel": (data: {}) => void;
  "existing-channel": () => void;
  "user-joined": (userId: string) => void;
  "webrtc-offer": (payload: WebRTCPayload) => void;
  "webrtc-answer": (payload: WebRTCPayload) => void;
  "ice-candidate": (payload: ICEPayload) => void;
}

interface RoomData {
  sharer: string;
  viewers: string[];
}

function toImmutableSnapshot<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

class WebSocketManager {
    #io: Server;
    #rooms: Record<string, RoomData>;

    constructor(server: http.Server) {
      this.#io = new Server<ClientEvent, ServerEvent>(server);
      this.#rooms = {};

      this.#initializeHandlers();
    }

    public get rooms(): Record<string, RoomData> {
      return toImmutableSnapshot<Record<string, RoomData>>(this.#rooms);
    }

    static attach(server: http.Server) {
      console.log("WebSocketManager instance attached to server");

      return new WebSocketManager(server);
    }

    static detach(wsManager: WebSocketManager) {
      wsManager.#io.close();
    }

    #initializeHandlers() {
      this.#io.on("connection", (socket: Socket<ClientEvent, ServerEvent>) => {
        console.log("New client connected:", socket.id);

        socket.on("join-channel", (msg: JoinMessage) => this.#handleJoinChannel(socket, msg));
        socket.on("webrtc-offer", (payload: WebRTCPayload) => this.#handleWebRTCOffer(socket, payload));
        socket.on("webrtc-answer", (payload: WebRTCPayload) => this.#handleWebRTCAnswer(socket, payload));
        socket.on("ice-candidate", (payload: ICEPayload) => this.#handleICECandidate(socket, payload));
        socket.on("disconnect", () => this.#handleDisconnect(socket));
      });
    }

    #handleJoinChannel(socket: Socket<ClientEvent, ServerEvent>, joinMessage: JoinMessage) {
      const sanitizedChannel = validator.escape(joinMessage.channel);
      
      if (!this.#rooms[sanitizedChannel]) {
        if (joinMessage.type === "sharer") {
          socket.join(sanitizedChannel);
          this.#rooms[sanitizedChannel] = { sharer: socket.id, viewers: [] };
          console.log("Client " + socket.id + " started the channel " + sanitizedChannel);
        } else {
          console.log("Client " + socket.id + " tried to join a non-existing channel " + sanitizedChannel);
          socket.emit("no-channel", {});
        }
      } else {
        if (joinMessage.type === "viewer") {
          socket.join(sanitizedChannel);
          this.#rooms[sanitizedChannel].viewers.push(socket.id);
          console.log(`${socket.id} joined channel: ${sanitizedChannel}`);
        } else {
          socket.emit("existing-channel");
        }
      }

      socket.to(sanitizedChannel).emit("user-joined", socket.id);
    }

    #handleWebRTCOffer(socket: Socket<ClientEvent, ServerEvent>, payload: WebRTCPayload) {
      console.log("Offer received from owner to " + payload.target);
      socket.to(payload.target).emit("webrtc-offer", { 
        ...payload, 
        target: this.#rooms[payload.channel].sharer 
      });
    }

    #handleWebRTCAnswer(socket: Socket<ClientEvent, ServerEvent>, payload: WebRTCPayload) {
      console.log("Answer received from", payload.from);
      socket.to(this.#rooms[payload.channel].sharer).emit("webrtc-answer", payload);
    }

    #handleICECandidate(socket: Socket<ClientEvent, ServerEvent>, payload: ICEPayload) {
      console.log("ICE Candidate received from " + payload.from + " to " + payload.to);
      socket.to(payload.to).emit("ice-candidate", payload);
    }

    #handleDisconnect(socket: Socket<ClientEvent, ServerEvent>) {
      console.log("Client disconnected:", socket.id);
      
      // Find the channel this socket was in
      const channel = Object.keys(this.#rooms).find(ch => 
        this.#rooms[ch].sharer === socket.id || 
        this.#rooms[ch].viewers.includes(socket.id)
      );

      if (channel && this.#rooms[channel]) {
        if (this.#rooms[channel].sharer === socket.id) {
          // Disconnect everybody if the sharer left
          this.#rooms[channel].viewers.forEach(viewer => 
            socket.to(viewer).emit('no-channel', {})
          );
          delete this.#rooms[channel];
          console.log("Room " + channel + " was deleted");
        } else if (this.#rooms[channel].viewers.includes(socket.id)) {
          this.#rooms[channel].viewers = this.#rooms[channel].viewers.filter(id => id !== socket.id);
          console.log("Client " + socket.id + " left the room " + channel);
        }
      }
    }
}

export { WebSocketManager };