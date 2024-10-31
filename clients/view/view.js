let socket;
let channelName;
let peerConnection;
let ownerId;
let debounceTimeout;

function toggleButton(id, status) {
  document.getElementById(id).disabled = !status;
}

window.addEventListener('load', () => {
  const channel = document.getElementById("channel");

  if (!!channel.value) {
    channelName = channel.value;
    console.log(channelName)
  }
});

function handleChannelName(event) {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    channelName = event.target.value;
    console.log(channelName);
    toggleButton("join", true);
  }, 500);
}

function joinChannel() {
  socket = io("http://localhost:3000"); // Connect to signaling server
  socket.emit("join-channel", { channel: channelName, type: "viewer" });

  socket.on("no-channel", () => {
    console.log("yeees");
    socket.disconnect();
    alert("channel does not exist");
  })

  // Handle receiving an offer from the sharer
  socket.on("webrtc-offer", async (payload) => {
    console.log("Offer received from sharer:", payload);
    ownerId = payload.target;

    // Create a new RTCPeerConnection
    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.1.google.com:19302" }] // STUN server
    });

    // Handle incoming tracks from the sharer
    peerConnection.ontrack = (event) => {
      console.log("Track event received:", event); // Log the event
      console.log("Received track:", event.track); // Log the track itself
      console.log("Track kind:", event.track.kind); // Check if it's video or audio
      console.log(event.streams);

      const mediaStream = event.streams[0];
      console.log("Receiving stream:", mediaStream);
      console.log("Tracks in stream:", mediaStream.getTracks()); // Check the tracks

      const remoteVideo = document.getElementById("remoteVideo");
      remoteVideo.srcObject = event.streams[0]; // Set the received stream to the video element
    };

    // Set the received offer as the remote description
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));

    // Create an answer and set it as the local description
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // Send the answer back to the sharer
    socket.emit("webrtc-answer", {
      channel: channelName,
      sdp: answer,
      from: socket.id // Send the viewer's ID
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          channel: channelName,
          from: socket.id,
          to: ownerId,
          candidate: event.candidate
        });

        console.log("Sent ICE candidate to sharer:", socket.id);
      }
    };

    peerConnection.onconnectionstatechange = (ev) => {
      console.log(peerConnection.connectionState)
      switch (peerConnection.connectionState) {
        case "connected":
          toggleButton("join", false);
          toggleButton("fullscreen", true);
          toggleButton("stop", true);
          break;
        case "disconnected":
        case "closed":
        case "failed":
          closeVideo();
      }
    }
  });

  // Handle ICE candidates received from the sharer
  socket.on("ice-candidate", (payload) => {
    if (peerConnection) {
      peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
        .then(() => console.log("Added ICE candidate from sharer:", payload.from))
        .catch(error => console.error("Error adding ICE candidate:", error));
    }
  });
}

function toFullscreen() {
  if (!document.fullscreenElement) {
    const remoteVideo = document.getElementById("remoteVideo");
    remoteVideo.requestFullscreen();
  }
}

function closeVideo() {
  const remoteVideo = document.getElementById("remoteVideo");
  remoteVideo.srcObject = null;
  socket.disconnect();
  peerConnection.close();

  toggleButton("fullscreen", false);
  toggleButton("stop", false);
  toggleButton("join", true);
}
