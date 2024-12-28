import { createServer } from "node:http";
import { type AddressInfo } from "node:net";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { WebSocketManager } from "../src/WebSocketManager";

describe("WebSocketManagerTest", () => {
    let webSocketManager: WebSocketManager, sharerClientSocket: ClientSocket, port: number;

    beforeAll((done) => {
        const httpServer = createServer();
        
        webSocketManager = WebSocketManager.attach(httpServer);
        
        httpServer.listen(() => {
            port = (httpServer.address() as AddressInfo).port;
            done();
        });
    });

    beforeEach((done) => {
        sharerClientSocket = ioc(`http://localhost:${port}`);
        sharerClientSocket.on("connect", () => {
            sharerClientSocket.emit("join-channel", { channel: "test", type: "sharer" });
            done();
        });
    })

    afterEach(() => {
        sharerClientSocket.disconnect();
    })

    afterAll(() => {
        WebSocketManager.detach(webSocketManager);
    });

    test("join channel as sharer", (done) => {
        sharerClientSocket.emit("join-channel", { channel: "test1", type: "sharer" });
        
        setTimeout(() => {
            const rooms = webSocketManager.rooms;
            expect(rooms["test1"]).toBeDefined();
            expect(rooms["test1"].sharer).toBe(sharerClientSocket.id);
            done();
        }, 100);
    });

    test("join existing channel as sharer", (done) => {
        sharerClientSocket.on("existing-channel", () => {
            done();
        });

        sharerClientSocket.emit("join-channel", { channel: "test", type: "sharer" });
    });

    test("join channel as viewer", (done) => {
        const viewerClientSocket = ioc(`http://localhost:${port}`);
        
        viewerClientSocket.on("connect", () => {
            viewerClientSocket.emit("join-channel", { channel: "test", type: "viewer" });

            setTimeout(() => {
                const rooms = webSocketManager.rooms;
                expect(rooms["test"].viewers).toContain(viewerClientSocket.id);
                viewerClientSocket.disconnect();
                done();
            }, 100);
        });
    });

    test("join non-existing channel as viewer", (done) => {
        sharerClientSocket.on("no-channel", () => { 
            done();
        });

        sharerClientSocket.emit("join-channel", { channel: "test2", type: "viewer" });
    });

    test("user-joined", (done) => {
        sharerClientSocket.on("user-joined", (socketId: string) => {
            expect(socketId).toBe(viewerClientSocket.id);
            viewerClientSocket.disconnect();
            done();
        });

        const viewerClientSocket = ioc(`http://localhost:${port}`);
        viewerClientSocket.on("connect", () => {
            viewerClientSocket.emit("join-channel", { channel: "test", type: "viewer" });
        });
    });

    test("webrtc-offer", (done) => {
        const viewerClientSocket = ioc(`http://localhost:${port}`);
        viewerClientSocket.on("connect", () => {
            viewerClientSocket.on("webrtc-offer", (payload: any) => {
                expect(payload.channel).toBe("test");
                expect(payload.target).toBe(sharerClientSocket.id);
                viewerClientSocket.disconnect();
                done();
            });

            sharerClientSocket.emit("webrtc-offer", { channel: "test", target: viewerClientSocket.id });
        });
    });

    test("webrtc-answer", (done) => {
        sharerClientSocket.on("webrtc-answer", (payload: any) => {
            expect(payload.channel).toBe("test");
            expect(payload.from).toBe(viewerClientSocket.id);
            viewerClientSocket.disconnect();
            done();
        });

        const viewerClientSocket = ioc(`http://localhost:${port}`);
        viewerClientSocket.on("connect", () => {
            viewerClientSocket.emit("webrtc-answer", { channel: "test", from: viewerClientSocket.id });
        });
    });

    test("ice-candidate", (done) => {
        sharerClientSocket.on("ice-candidate", (payload: any) => {
            expect(payload.channel).toBe("test");
            expect(payload.from).toBe(viewerClientSocket.id);
            expect(payload.to).toBe(sharerClientSocket.id);
            viewerClientSocket.disconnect();
            done();
        });

        const viewerClientSocket = ioc(`http://localhost:${port}`);
        viewerClientSocket.on("connect", () => {
            viewerClientSocket.emit("ice-candidate", { channel: "test", from: viewerClientSocket.id, to: sharerClientSocket.id });
        });
    });

    test("disconnect viewer", (done) => {
        const viewerClientSocket = ioc(`http://localhost:${port}`);
        viewerClientSocket.on("connect", () => {
            viewerClientSocket.emit("join-channel", { channel: "test", type: "viewer" });
            viewerClientSocket.disconnect();

            setTimeout(() => {
                const rooms = webSocketManager.rooms;
                expect(rooms["test"].viewers).not.toContain(viewerClientSocket.id);
                done();
            }, 100);
        });
    });

    test("disconnect sharer", (done) => {
        sharerClientSocket.on("user-joined", (socketId: string) => {
            sharerClientSocket.disconnect();
        });

        const viewerClientSocket = ioc(`http://localhost:${port}`);
        viewerClientSocket.on("connect", () => {
            viewerClientSocket.emit("join-channel", { channel: "test", type: "viewer" });
        });

        viewerClientSocket.on("no-channel", () => {
            const rooms = webSocketManager.rooms;
            expect(rooms["test"]).toBeUndefined();
            viewerClientSocket.disconnect();
            done();
        });
    });
});