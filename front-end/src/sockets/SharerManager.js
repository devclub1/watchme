import { socket } from "./socket";

class SharerManager {
    constructor() {
        console.log("init sharer manager");
        this.socket = socket;
    }

    connect() {
        this.socket.connect();
    }

    disconnect() {
        this.socket.disconnect();
    }
}

export default SharerManager;