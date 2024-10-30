let captureStream = null;
let socket = null;

async function startCapture() {  
    try {
      captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch (err) {
      console.error(`Error: ${err}`);
    }

    return captureStream;
  }

  async function triggerCapture() {
    const displayMediaOptions = {
        video: {
          displaySurface: "browser",
        },
        audio: {
          suppressLocalAudioPlayback: false,
        },
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        systemAudio: "include",
        surfaceSwitching: "include",
        monitorTypeSurfaces: "include",
      };

    // document.getElementById("video").srcObject = await startCapture(displayMediaOptions);
  }

  async function triggerShare() {
    socket = io("http://localhost:3000"); // Connect to signaling server
    captureStream = await startCapture();

    // Channel name for the screen-sharing session
    const channel = "watchme1";
    let peerConnection = new RTCPeerConnection({
        iceServers: [{urls: "stun:stun.1.google.com:19302"}] // STUN server to help with NAT traversal
    });

    captureStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, captureStream);
      console.log("Added track");
      console.log(track);
    });

        // Log the tracks being sent
      peerConnection.getSenders().forEach(sender => {
          console.log("Sender track:", sender.track);
      });

    // Join the specified channel
    socket.emit("join-channel", channel);
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send the offer through the signaling server
    const offerToSend = {channel, sdp: offer};
    console.log(offerToSend);

    socket.emit("webrtc-offer", offerToSend);
    console.log("Screen sharing started, offer sent to channel:", channel);

    socket.on("webrtc-answer", (payload) => {
      peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          .then(() => console.log("Received answer from viewer"))
          .catch(error => console.error("Error setting remote description:", error));
    });

    // Handle ICE candidates sent by the viewer
    socket.on("ice-candidate", (payload) => {
        peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
            .then(() => console.log("Added ICE candidate from viewer"))
            .catch(error => console.error("Error adding ICE candidate:", error));
    });

    // Send ICE candidates to the viewer as they are gathered
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", {
                channel,
                from: socket.id,
                candidate: event.candidate
            });
            console.log("Sent ICE candidate to channel:", channel);
        }
    };
  }