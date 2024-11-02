const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('../clients'))

const rooms = {};

// Handle WebSocket connections
io.on("connection", (socket) => {
  let channel;
  console.log("New client connected:", socket.id);

  // Join a specific channel (room) selected by the user
  socket.on("join-channel", (joinMessage) => {

    if (!rooms[joinMessage.channel]) {
      if (joinMessage.type === "sharer") {
        socket.join(joinMessage.channel)
        rooms[joinMessage.channel] = { sharer: socket.id, viewers: [] };
        console.log("Client " + socket.id + " started the channel " + joinMessage.channel);
        channel = joinMessage.channel;
      } else {
        console.log("Client " + socket.id + " tried to join a non-existing channel " + joinMessage.channel);
        socket.emit("no-channel", {});
      }
    } else {
      if (joinMessage.type === "viewer") {
        socket.join(joinMessage.channel)
        rooms[joinMessage.channel].viewers.push(socket.id);
        console.log(`${socket.id} joined channel: ${joinMessage.channel}`);
        channel = joinMessage.channel;
      } else {
        socket.emit("existing-channel");
      }
    }

    // Notify other users in the channel about a new participant
    socket.to(joinMessage.channel).emit("user-joined", socket.id);
  });

  // Handle receiving SDP offer or answer from a peer
  socket.on("webrtc-offer", (payload) => {
    console.log("Offer received from owner to " + payload.target);
    socket.to(payload.target).emit("webrtc-offer", { ...payload, target: rooms[payload.channel].sharer });
  });

  socket.on("webrtc-answer", (payload) => {
    console.log("Answer received from", payload.from);
    socket.to(rooms[payload.channel].sharer).emit("webrtc-answer", payload);
  });

  // Handle ICE candidates sent by a peer
  socket.on("ice-candidate", (payload) => {
    console.log("ICE Candidate received from " + payload.from + " to " + payload.to);
    socket.to(payload.to).emit("ice-candidate", payload);
  });

  // Handle a user disconnecting
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    if (!!rooms[channel]) {
      if (rooms[channel].sharer === socket.id) {
        // disconnect everybody
        rooms[channel].viewers.forEach(viewer => socket.to(viewer).emit('no-channel'));
        delete rooms[channel];
        console.log("Room " + channel + " was deleted");
      } else if (rooms[channel].viewers.includes(socket.id)) {
        rooms[channel].viewers.splice(rooms[channel].viewers.indexOf(socket.id), 1);
        console.log("Client " + socket.id + " left the room " + channel);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
