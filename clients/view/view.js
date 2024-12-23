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

function toggleElement(id, status) {
  document.getElementById(id).classList.toggle("hidden", !status);
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
    configContainer.className = "flex justify-between items-center p-4 rounded-lg";

    const configInfo = document.createElement("div");
    configInfo.className = "space-y-1";

    if (!!configuration.urls) {
      const paragraph = document.createElement("p");
      paragraph.className = "text-gray-700";
      paragraph.innerText = "urls: " + configuration.urls;
      configInfo.appendChild(paragraph);
    }

    if (!!configuration.username) {
      const paragraph = document.createElement("p");
      paragraph.className = "text-gray-700";
      paragraph.innerText = "username: " + configuration.username;
      configInfo.appendChild(paragraph);
    }

    if (!!configuration.credential) {
      const paragraph = document.createElement("p");
      paragraph.className = "text-gray-700";
      paragraph.innerText = "credential: " + configuration.credential;
      configInfo.appendChild(paragraph);
    }

    configContainer.appendChild(configInfo);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Remove";
    deleteButton.className = "px-4 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black";
    deleteButton.onclick = () => removeConfig(index);
    configContainer.appendChild(deleteButton);

    container.appendChild(configContainer);
  });
}

function toggleSettings() {
  displaySettings = !displaySettings;
  toggleElement("settings-container", displaySettings);

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

  socket = io(signalingServer);
  socket.emit("join-channel", { channel: channelName, type: "viewer" });

  socket.on("no-channel", () => {
    shouldDisconnect = true;
    socket.disconnect();
    alert("The stream has ended");
  })

  socket.on("webrtc-offer", async (payload) => {
    console.log("Offer received from sharer:", payload);
    ownerId = payload.target;

    peerConnection = new RTCPeerConnection({
      iceServers: configurations,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      sdpSemantics: "unified-plan",
      iceCandidatePoolSize: 10
    });

    peerConnection.ontrack = (event) => {
      console.log("Track event received:", event);
      const mediaStream = event.streams[0];
      const remoteVideo = document.getElementById("remote-video");
      remoteVideo.srcObject = mediaStream;
      remoteVideo.controls = true;
      remoteVideo.style.transform = 'translateZ(0)';
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("webrtc-answer", {
      channel: channelName,
      sdp: answer,
      from: socket.id
    });

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

    peerConnection.onconnectionstatechange = () => {
      console.log(peerConnection.connectionState)
      switch (peerConnection.connectionState) {
        case "connected":
          toggleButton("join", false);
          toggleButton("fullscreen", true);
          toggleButton("stop", true);
          toggleButton("settings", false);          
          break;
        case "disconnected":
          if (shouldDisconnect) {
            console.log("correctly disconnected");
          } else {
            console.log("unexpected disconnect, trying reconnection");
            socket.disconnect();
            joinChannel();
            break;
          }
        case "closed":
        case "failed":
          closeVideo();
      }
    }
  });

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
    const remoteVideo = document.getElementById("remote-video");
    remoteVideo.requestFullscreen();
  }
}

function closeVideo() {
  const remoteVideo = document.getElementById("remote-video");
  remoteVideo.srcObject = null;
  remoteVideo.controls = false;
  socket.disconnect();
  peerConnection.close();

  shouldDisconnect = true;

  toggleButton("fullscreen", false);
  toggleButton("stop", false);
  toggleButton("join", true);
  toggleButton("settings", true);
}
