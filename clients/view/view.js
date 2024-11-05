const signalingServer = "http://localhost:3000";
const defaultConfigurations = [{ urls: "stun:stun.l.google.com:19302" }]

let socket;
let peerConnection;

let channelName;
let ownerId;

let debounceTimeout;
let configurations = [];
let displaySettings = false;

let shouldDisconnect = false;

function toggleButton(id, status) {
  document.getElementById(id).disabled = !status;
}

window.addEventListener('load', () => {
  const channel = document.getElementById("channel");

  if (!!channel.value) {
    channelName = channel.value;
  }
});

function loadConfig() {
  if (configurations.length === 0) {
    const storedConfigurations = localStorage.getItem("configurations");

    if (!!storedConfigurations) {
      configurations = JSON.parse(storedConfigurations);
    } else {
      configurations = JSON.parse(JSON.stringify(defaultConfigurations));
    }
  }

  const container = document.getElementById("configurations-container");
  container.innerHTML = "";

  configurations.forEach((configuration, index) => {
    const configContainer = document.createElement("div");
    configContainer.style.margin = "20px";

    if (!!configuration.urls) {
      const paragraph = document.createElement("p");
      paragraph.innerText = "urls: " + configuration.urls;
      configContainer.appendChild(paragraph);
    }

    if (!!configuration.username) {
      const paragraph = document.createElement("p");
      paragraph.innerText = "username: " + configuration.username;
      configContainer.appendChild(paragraph);
    }

    if (!!configuration.credential) {
      const paragraph = document.createElement("p");
      paragraph.innerText = "credential: " + configuration.credential;
      configContainer.appendChild(paragraph);
    }

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "remove";
    deleteButton.onclick = () => removeConfig(index)
    configContainer.appendChild(deleteButton);

    container.appendChild(configContainer);
  });
}

function toggleSettings() {
  displaySettings = !displaySettings;

  const settings = document.getElementById("settings-container");
  settings.style.display = displaySettings ? "block" : "none";
  settings.style.visibility = displaySettings ? "visible" : "hidden";

  if (displaySettings) {
    loadConfig();
  }
}

function toggleModal(status) {
  const modal = document.getElementById("add-config-dialog");

  if (status) {
    modal.showModal();
  } else {
    modal.close();
  }
}

function submitNewConfiguration(event) {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(event.target).entries().filter(([_, value]) => value !== null && value != undefined && value !== ''));

  if (!!data.urls) {
    configurations.push(data);
    localStorage.setItem("configurations", JSON.stringify(configurations));
    toggleModal(false);
    loadConfig();
  } else {
    alert("URL parameter cannot be empty");
  }
}

function removeConfig(index) {
  configurations.splice(index, 1);
  localStorage.setItem("configurations", JSON.stringify(configurations));
  loadConfig();
}

function resetConfig() {
  localStorage.removeItem("configurations");
  configurations = [];
  loadConfig();
}

function handleChannelName(event) {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    channelName = event.target.value;
    toggleButton("join", true);
  }, 500);
}

function joinChannel() {
  shouldDisconnect = false;

  socket = io(signalingServer); // Connect to signaling server
  socket.emit("join-channel", { channel: channelName, type: "viewer" });

  socket.on("no-channel", () => {
    shouldDisconnect = true;
    socket.disconnect();
    alert("channel does not exist");
  })

  // Handle receiving an offer from the sharer
  socket.on("webrtc-offer", async (payload) => {
    console.log("Offer received from sharer:", payload);
    ownerId = payload.target;

    // Create a new RTCPeerConnection
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ]
    });

    // Handle incoming tracks from the sharer
    peerConnection.ontrack = (event) => {
      console.log("Track event received:", event); // Log the event

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
          if (shouldDisconnect) {
            console.log("correctly disconnected");
          } else {
            console.log("unexpected disconnect, trying reconnection");
            joinChannel();
            break;
          }
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

  shouldDisconnect = true;

  toggleButton("fullscreen", false);
  toggleButton("stop", false);
  toggleButton("join", true);
}
