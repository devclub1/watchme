export const defaultConfigurations = [{ urls: "stun:stun.l.google.com:19302" }];

export const signalingServer = process.env.NODE_ENV === 'production'
    ? window.location.origin
    : "http://localhost:3000";
