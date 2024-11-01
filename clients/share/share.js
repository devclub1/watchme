const signalingServer = "http://localhost:3000";

let captureStream = null;
let socket = null;
let peerConnections = {};
let channelName = null;
let debounceTimeout = null;
let viewers = 0;

window.addEventListener('load', () => {
  const channel = document.getElementById("channel");

  if (!!channel.value) {
    channelName = channel.value;
    console.log(channelName)
  }
});

function toggleButton(id, status) {
  document.getElementById(id).disabled = !status;
}

function toggleElement(id, status) {
  document.getElementById(id).style.display = status ? "inline-block" : "none";
}

function handleChannelName(event) {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    channelName = event.target.value;
    toggleButton("share", true);
  }, 500);
}

async function startCapture() {
  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  } catch (err) {
    console.error(`Error: ${err}`);
  }

  return captureStream;
}

async function triggerShare() {
  socket = io(signalingServer); // Connect to signaling server
  captureStream = await startCapture();

  if (!captureStream) {
    return;
  }

  toggleButton("share", false);
  toggleButton("stop", true)
  toggleElement("viewers", true);
  toggleElement("overlay-text", true);

  document.getElementById("video").srcObject = captureStream;

  socket.emit("join-channel", { channel: channelName, type: "sharer" });

  socket.on("existing-channel", () => {
    stopShare();
    alert("Channel " + channelName + " is already existing");
  });

  socket.on("user-joined", async (socketId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        // { urls: "tun:tun_ip:3478", username: "username", credential: "password" }
      ]
    });

    captureStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, captureStream);
      console.log("Added track");
    });

    peerConnections[socketId] = peerConnection;

    // Log the tracks being sent
    peerConnection.getSenders().forEach(sender => {
      console.log("Sender track:", sender.track);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send ICE candidates to the viewer as they are gathered
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          channel: channelName,
          from: socket.id,
          to: socketId,
          candidate: event.candidate
        });

        console.log("Sent ICE candidate to channel:", channelName);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;

      if (state === "connected") {
        updateViewers(true);
      } else if (state === "disconnected" || state === "failed") {
        updateViewers(false);
        console.log("Client " + socket.id + "disconnected");
        peerConnection.close();
        delete peerConnections[socketId];
      }
    }

    // Send the offer through the signaling server
    const offerToSend = { channel: channelName, target: socketId, sdp: offer };
    socket.emit("webrtc-offer", offerToSend);

    console.log("Screen sharing started, offer sent to channel:", channelName);
  });

  socket.on("webrtc-answer", (payload) => {
    console.log("received answer");

    peerConnections[payload.from].setRemoteDescription(new RTCSessionDescription(payload.sdp))
      .then(() => console.log("Received answer from viewer"))
      .catch(error => console.error("Error setting remote description:", error));
  });

  // Handle ICE candidates sent by the viewer
  socket.on("ice-candidate", (payload) => {
    console.log("received ice candidate")

    peerConnections[payload.from].addIceCandidate(new RTCIceCandidate(payload.candidate))
      .then(() => console.log("Added ICE candidate from viewer"))
      .catch(error => console.error("Error adding ICE candidate:", error));
  });
}

function updateViewers(type) {
  viewers = type ? viewers + 1 : viewers === 0 ? 0 : viewers - 1;
  document.getElementById("viewersCount").innerText = viewers;
}

function stopShare() {
  toggleButton("share", true);
  toggleButton("stop", false);
  toggleElement("viewers", false);
  toggleElement("overlay-text", false);

  socket.disconnect();

  Object.values(peerConnections).forEach(peerConnection => peerConnection.close());
  captureStream.getTracks()[0].stop();
  document.getElementById("video").srcObject = null;
}
