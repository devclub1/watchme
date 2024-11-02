const signalingServer = "http://localhost:3000";
const defaultConfigurations = [{ urls: "stun:stun.l.google.com:19302" }]

let captureStream = null;
let socket = null;
let peerConnections = {};
let channelName = null;
let debounceTimeout = null;
let viewers = 0
let configurations = [];
let displaySettings = false;

window.addEventListener('load', () => {
  const channel = document.getElementById("channel");

  if (!!channel.value) {
    channelName = channel.value;
  }

  loadConfig();
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

function toggleSettings() {
  displaySettings = !displaySettings;
  document.getElementById("settings-container").style.visibility = displaySettings ? "visible" : "hidden";
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
    const peerConnection = new RTCPeerConnection({ iceServers: configurations });

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
