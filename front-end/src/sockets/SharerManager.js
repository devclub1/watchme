import { socket } from "./socket";

class SharerManager {
    captureStream = null;
    captureMicStream = null;

    constructor() {
        console.log("init sharer manager");
        this.socket = socket;
    }

    connect(channelName, captureSystemAudio, captureMic, setVideoStream) {
        this.socket.connect();

        this.share(channelName, captureSystemAudio, captureMic, setVideoStream);
    }

    async share(channelName, captureSystemAudio, captureMic, handlers) {
        await this.captureScreen(captureSystemAudio);

        if (!this.captureStream) {
            return;
        }

        if (captureMic) {
            await this.captureMicrophone();

            if (!this.captureMicStream) {
                return;
            }
        }

        handlers.setVideoStream(this.captureStream);
        handlers.setIsActive(true);

        socket.emit("join-channel", { channel: channelName, type: "sharer" });
    }

    async captureScreen(captureSystemAudio) {
        try {
            this.captureStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: captureSystemAudio ? { supressLocalAudioPlayback: true } : false });

            if (this.captureStream.getVideoTracks().length > 0) {
                this.captureStream.getVideoTracks()[0].contentHint = "detail";
            }

            if (this.captureStream.getAudioTracks().length > 0) {
                this.captureStream.getAudioTracks()[0].enabled = captureSystemAudio;
            }
        } catch (err) {
            console.error(`Error: ${err}`);
        }
    }

    async captureMicrophone() {
        try {
            this.captureMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error(`Error: ${err}`);
        }
    }

    disconnect(handlers) {
        this.socket.disconnect();

        if (this.captureStream) {
            this.captureStream.getTracks().forEach(track => track.stop());
        }

        if (this.captureMicStream) {
            this.captureMicStream.getTracks().forEach(track => track.stop());
        }

        this.captureStream = null;
        this.captureMicStream = null;

        handlers.setVideoStream(null);
        handlers.setIsActive(false);
        handlers.setViewersCount(0);
    }
}

export default SharerManager;