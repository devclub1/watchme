let captureStream = null;
let socket = null;
let peerConnections = {};
let channelName = null;
let debounceTimeout = null;

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
  socket = io("http://localhost:3000"); // Connect to signaling server
  captureStream = await startCapture();

  if (!captureStream) {
    return;
  }

  toggleButton("share", false);
  toggleButton("stop", true)

  document.getElementById("video").srcObject = captureStream;
  // Channel name for the screen-sharing session

  socket.emit("join-channel", { channel: channelName, type: "sharer" });

  socket.on("existing-channel", () => {
    stopShare();
    alert("Channel " + channelName + " is already existing");
  });

  socket.on("user-joined", async (socketId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.1.google.com:19302" }] // STUN server to help with NAT traversal
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

      if (state === "disconnected" || state === "failed") {
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
    console.log(payload);

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

function stopShare() {
  toggleButton("share", true);
  toggleButton("stop", false);

  socket.disconnect();

  Object.values(peerConnections).forEach(peerConnection => peerConnection.close());
  captureStream.getTracks()[0].stop();
  document.getElementById("video").srcObject = null;
}
