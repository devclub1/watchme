import { io } from "socket.io-client";

class SharerManager {
    #socket = null;

    #captureStream = null;
    #captureMicStream = null;

    #peerConnections = {};

    constructor() {
        console.log("init sharer manager");
        this.#socket = io("http://localhost:3000");
    }

    connect(channelName, configurations, setIsActive, setVideoStream, setViewersCount, captureSystemAudio, captureMic) {
        this.#socket.connect();
        this.startChannel(channelName, configurations, setIsActive, setVideoStream, setViewersCount, captureSystemAudio, captureMic);
    }

    async startChannel(channelName, configurations, setIsActive, setVideoStream, setViewersCount, captureSystemAudio, captureMic) {
        await this.captureScreen(captureSystemAudio);

        if (!this.#captureStream) {
            return;
        }

        if (captureMic) {
            await this.captureMicrophone();

            if (!this.#captureMicStream) {
                return;
            }
        }

        setVideoStream(this.#captureStream);
        setIsActive(true);

        this.attachSocketHandlers(channelName, configurations, setIsActive, setVideoStream, setViewersCount );

        this.#socket.emit("join-channel", { channel: channelName, type: "sharer" });
    }

    async attachSocketHandlers(channelName, configurations, setIsActive, setVideoStream, setViewersCount) {
        this.#socket.on("existing-channel", () => {
            this.disconnect(setIsActive, setVideoStream, setViewersCount);
            alert("Channel " + channelName + " is already existing");
        });

        this.#socket.on("user-joined", async (socketId) => {
            const peerConnection = new RTCPeerConnection({
                iceServers: configurations,
                bundlePolicy: "max-bundle",
                rtcpMuxPolicy: "require",
                sdpSemantics: "unified-plan",
                iceCandidatePoolSize: 10
            });

            this.#peerConnections[socketId] = peerConnection;

            this.#captureStream.getTracks().forEach(track => {
                if (track.kind === 'video') {
                    peerConnection.addTransceiver(track, {
                        direction: 'sendonly',
                        streams: [this.#captureStream],
                        sendEncodings: [{
                            scalabilityMode: 'L3T3',
                            maxBitrate: 3000000,
                            maxFramerate: 60
                        }]
                    });
                    console.log("Added video tracks");
                } else {
                    peerConnection.addTrack(track, this.#captureStream);
                    console.log("Added device audio track");
                }
            });

            if (this.#captureMicStream) {
                this.#captureMicStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, this.#captureStream);
                    console.log("Added mic track");
                })
            }

            peerConnection.getSenders().forEach(sender => {
                console.log("Sender track:", sender.track);
            });

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.#socket.emit("ice-candidate", {
                        channel: channelName,
                        from: this.#socket.id,
                        to: socketId,
                        candidate: event.candidate
                    });

                    console.log("Sent ICE candidate to:", socketId);
                }
            };

            peerConnection.oniceconnectionstatechange = () => {
                const state = peerConnection.iceConnectionState;

                if (state === "connected") {
                    setViewersCount((viewers) => viewers + 1);
                } else if (state === "disconnected" || state === "failed") {
                    setViewersCount((viewers) => viewers > 0 ? viewers - 1 : viewers);
                    console.log("Client " + socketId + " disconnected");
                    peerConnection.close();
                    delete this.#peerConnections[socketId];
                }
            }

            const offer = await peerConnection.createOffer();
            const modifiedOffer = offer.sdp.replace("VP8", "H264");
            await peerConnection.setLocalDescription(new RTCSessionDescription({ type: "offer", sdp: modifiedOffer }));

            this.#socket.emit("webrtc-offer", { channel: channelName, target: socketId, sdp: offer });

            console.log("Screen sharing started, offer sent to channel:", channelName);
        });

        this.#socket.on("webrtc-answer", (payload) => {
            this.#peerConnections[payload.from].setRemoteDescription(new RTCSessionDescription(payload.sdp))
              .then(() => console.log("Received answer from viewer", payload))
              .catch(error => console.error("Error setting remote description:", error));
          });
        
        this.#socket.on("ice-candidate", (payload) => {
            this.#peerConnections[payload.from].addIceCandidate(new RTCIceCandidate(payload.candidate))
              .then(() => console.log("Added ICE candidate from viewer"))
              .catch(error => console.error("Error adding ICE candidate:", error));
          });
    }

    async captureScreen(captureSystemAudio) {
        try {
            this.#captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: captureSystemAudio ? { supressLocalAudioPlayback: true } : false });

            if (this.#captureStream.getVideoTracks().length > 0) {
                this.#captureStream.getVideoTracks()[0].contentHint = "detail";
            }

            if (this.#captureStream.getAudioTracks().length > 0) {
                this.#captureStream.getAudioTracks()[0].enabled = captureSystemAudio;
            }
        } catch (err) {
            console.error(`Error: ${err}`);
        }
    }

    async captureMicrophone() {
        try {
            this.#captureMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error(`Error: ${err}`);
        }
    }

    disconnect(setIsActive, setVideoStream, setViewersCount) {
        this.#socket.disconnect();

        if (this.#captureStream) {
            this.#captureStream.getTracks().forEach(track => track.stop());
        }

        if (this.#captureMicStream) {
            this.#captureMicStream.getTracks().forEach(track => track.stop());
        }

        this.#captureStream = null;
        this.#captureMicStream = null;

        setVideoStream(null);
        setIsActive(false);
        setViewersCount(0);
    }
}

export default SharerManager;