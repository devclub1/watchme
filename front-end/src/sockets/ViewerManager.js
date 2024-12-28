import { io } from "socket.io-client";
import { signalingServer } from "../data/defaults";

class ViewerManager {
    #socket = null;
    #shouldDisconnect = false;
    #peerConnection = null;

    constructor() {
        console.log("init viewer manager");
        this.#socket = io(signalingServer);
    }

    async connect(channelName, configurations, setIsActive, setVideoStream) {
        this.joinChannel(channelName, configurations, setIsActive, setVideoStream);
    }

    joinChannel(channelName, configurations, setIsActive, setVideoStream) {
        this.attachSocketHandlers(channelName, configurations, setIsActive, setVideoStream);

        this.#socket.emit("join-channel", { channel: channelName, type: "viewer" });
    }

    async attachSocketHandlers(channelName, configurations, setIsActive, setVideoStream) {
        this.#socket.on("no-channel", () => {
            this.disconnect(setIsActive, setVideoStream);
            alert("The stream has ended");
        });

        this.#socket.on("webrtc-offer", async (payload) => {
            console.log("Offer received from sharer:", payload);
            const ownerId = payload.target;

            this.#peerConnection = new RTCPeerConnection({
                iceServers: configurations,
                iceTransportPolicy: "all",
                bundlePolicy: "max-bundle",
                rtcpMuxPolicy: "require",
                sdpSemantics: "unified-plan",
                iceCandidatePoolSize: 10
            });

            this.#peerConnection.ontrack = (event) => {
                console.log("Track event received:", event);
                const mediaStream = event.streams[0];
                setVideoStream(mediaStream);
            };

            await this.#peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            const answer = await this.#peerConnection.createAnswer();
            await this.#peerConnection.setLocalDescription(answer);

            this.#peerConnection.onicecandidate = (event) => {
                console.log("ICE received", event.candidate);
                if (event.candidate) {
                    this.#socket.emit("ice-candidate", {
                        channel: channelName,
                        from: this.#socket.id,
                        to: ownerId,
                        candidate: event.candidate
                    });

                    console.log("Sent ICE candidate to sharer:", event.candidate);
                }
            };

            this.#peerConnection.onconnectionstatechange = () => {
                console.log(this.#peerConnection.connectionState);

                switch (this.#peerConnection.connectionState) {
                    case "connected":
                        setIsActive(true);
                        break;
                    case "disconnected":
                        if (this.#shouldDisconnect) {
                            console.log("correctly disconnected");
                        } else {
                            console.log("unexpected disconnect, trying reconnection");
                            this.disconnect(setIsActive, setVideoStream);
                            this.joinChannel(channelName, configurations, setIsActive, setVideoStream);
                            break;
                        }
                    case "closed":
                    case "failed":
                        this.disconnect(setIsActive, setVideoStream);
                        break;
                }
            }

            this.#socket.emit("webrtc-answer", {
                channel: channelName,
                sdp: answer,
                from: this.#socket.id
            });
        });

        this.#socket.on("ice-candidate", (payload) => {
            if (this.#peerConnection) {
                this.#peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
                    .then(() => console.log("Added ICE candidate from sharer:", payload.candidate))
                    .catch(error => console.error("Error adding ICE candidate:", error));
            }
        });
    }

    disconnect(setIsActive, setVideoStream) {
        if (this.#socket) {
            this.#socket.disconnect();
        }

        if (this.#peerConnection) {
            this.#peerConnection.close();
        }

        this.#shouldDisconnect = true;
        this.#peerConnection = null;

        setIsActive(false);
        setVideoStream(null);
    }
}

export default ViewerManager;
