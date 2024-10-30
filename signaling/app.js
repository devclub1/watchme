const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("WebRTC Signaling Server is running");
});

app.use(express.static('../clients'))

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Join a specific channel (room) selected by the user
  socket.on("join-channel", (channel) => {
    socket.join(channel);
    console.log(`${socket.id} joined channel: ${channel}`);

    // Notify other users in the channel about a new participant
    socket.to(channel).emit("user-joined", socket.id);
  });

  // Handle receiving SDP offer or answer from a peer
  socket.on("webrtc-offer", (payload) => {
    console.log("Offer received from", payload);
    socket.to(payload.channel).emit("webrtc-offer", payload);
  });

  socket.on("webrtc-answer", (payload) => {
    console.log("Answer received from", payload.from);
    socket.to(payload.channel).emit("webrtc-answer", payload);
  });

  // Handle ICE candidates sent by a peer
  socket.on("ice-candidate", (payload) => {
    console.log("ICE Candidate received from", payload.from);
    socket.to(payload.channel).emit("ice-candidate", payload);
  });

  // Handle a user disconnecting
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
