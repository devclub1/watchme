const signalingServer = "http://localhost:3000";
const defaultConfigurations = [{ urls: "stun:stun.l.google.com:19302" }]

let contentHint = "detail";

let captureStream = null;
let captureMicStream = null;

let socket = null;
let peerConnections = {};

let debounceTimeout = null;

let channelName = null;
let viewers = 0

let displaySettings = false;
let configurations = [];
let captureSystemAudio = false;
let captureMic = false;

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
    configContainer.className = "flex justify-between items-center p-4 bg-gray-50 rounded-lg";

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

async function toggleAudio(event, type) {
  if (type === "system") {
    captureSystemAudio = event.target.checked;
    if (!!captureStream && captureStream.getAudioTracks().length > 0) {
      captureStream.getAudioTracks()[0].enabled = captureSystemAudio;
    }
  } else if (type === "mic") {
    captureMic = event.target.checked;

    if (!!captureMicStream && captureMicStream.getAudioTracks().length > 0) {
      captureMicStream.getAudioTracks()[0].enabled = captureMic;
    }
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

function toggleButton(id, status) {
  document.getElementById(id).disabled = !status;
}

function toggleElement(id, status, flex) {
  document.getElementById(id).style.display = status ? flex ? "flex" : "inline-block" : "none";
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
    captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: captureSystemAudio ? { supressLocalAudioPlayback: true } : false });

    if (captureStream.getVideoTracks().length > 0) {
      captureStream.getVideoTracks()[0].contentHint = contentHint;
    }

    if (captureStream.getAudioTracks().length > 0) {
      captureStream.getAudioTracks()[0].enabled = captureSystemAudio;
    }
  } catch (err) {
    console.error(`Error: ${err}`);
  }
}

async function startMicCapture() {
  try {
    captureMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error(`Error: ${err}`);
  }
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

async function startShare() {
  socket = io(signalingServer);
  await startCapture();

  if (!captureStream) {
    return;
  }

  if (captureMic) {
    await startMicCapture();

    if (!captureMicStream) {
      return;
    }
  } else {
    document.getElementById("captureMic").disabled = true;
  }

  toggleButton("share", false);
  toggleButton("stop", true);
  toggleButton("settings", false);
  toggleElement("viewers", true, true);
  toggleElement("overlay-text", true);

  document.getElementById("video").srcObject = captureStream;

  socket.emit("join-channel", { channel: channelName, type: "sharer" });

  socket.on("existing-channel", () => {
    stopShare();
    alert("Channel " + channelName + " is already existing");
  });

  socket.on("user-joined", async (socketId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: configurations,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      sdpSemantics: "unified-plan",
      iceCandidatePoolSize: 10
    });

    const videoEncodings = [
      {
        rid: 'high',
        maxBitrate: 3000000,
        maxFramerate: 60,
        scaleResolutionDownBy: 1
      },
      {
        rid: 'medium',
        maxBitrate: 1000000,
        maxFramerate: 30,
        scaleResolutionDownBy: 2
      },
      {
        rid: 'low',
        maxBitrate: 500000,
        maxFramerate: 15,
        scaleResolutionDownBy: 4
      }
    ];

    captureStream.getTracks().forEach(track => {
      if (track.kind === 'video') {
        const sender = peerConnection.addTrack(track, captureStream);
        
        const params = sender.getParameters();
        params.encodings = videoEncodings;
        sender.setParameters(params);

        console.log("Added device video track with simulcast encodings");
      } else {
        peerConnection.addTrack(track, captureStream);
        console.log("Added device audio track");
      }
    });

    if (captureMic) {
      captureMicStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, captureStream);
        console.log("Added mic track");
      })
    }

    peerConnections[socketId] = peerConnection;

    peerConnection.getSenders().forEach(sender => {
      console.log("Sender track:", sender.track);
    });

    const offer = await peerConnection.createOffer();
    const modifiedOffer = offer.sdp.replace("VP8", "H264");
    await peerConnection.setLocalDescription(new RTCSessionDescription({ type: "offer", sdp: modifiedOffer }));

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
        console.log("Client " + socket.id + " disconnected");
        peerConnection.close();
        delete peerConnections[socketId];
      }
    }

    const offerToSend = { channel: channelName, target: socketId, sdp: offer };
    socket.emit("webrtc-offer", offerToSend);

    console.log("Screen sharing started, offer sent to channel:", channelName);
  });

  socket.on("webrtc-answer", (payload) => {
    peerConnections[payload.from].setRemoteDescription(new RTCSessionDescription(payload.sdp))
      .then(() => console.log("Received answer from viewer"))
      .catch(error => console.error("Error setting remote description:", error));
  });

  socket.on("ice-candidate", (payload) => {
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
  toggleButton("settings", true);
  toggleElement("viewers", false);
  toggleElement("overlay-text", false);

  socket.disconnect();

  Object.values(peerConnections).forEach(peerConnection => peerConnection.close());

  captureStream.getTracks().forEach(track => track.stop());
  if (captureMic) {
    captureMicStream.getTracks().forEach(track => track.stop());
  }

  captureStream = null;
  captureMicStream = null;

  viewers = 0;
  updateViewers(false);
  document.getElementById("video").srcObject = null;
  document.getElementById("captureMic").disabled = false;
}
