import { socket } from "./socket";

class ViewerManager {
    constructor() {
        console.log("init viewer manager");
        this.socket = socket;
    }

    connect() {
        this.socket.connect();
    }

    disconnect() {
        this.socket.disconnect();
    }
}

export default ViewerManager;