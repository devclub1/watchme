<div style="margin: 0 auto">
    <img src="https://raw.githubusercontent.com/devclub1/watchme/main/front-end/src/assets/logo-watchme.png" alt="watchme" width="500px">
</div>

#### share your screen without headaches

## Content
- [1. Installation](#1-installation)
- [2. Usage](#2-usage)
- [3. Notes](#3-notes)

#
### 1. Installation
- Install dependencies
    ```bash
    cd watchme
    npm install
    ```

- Run the app
    - 1. Development
        ```bash
        cd watchme
        npm run dev
        ```

    - 2. Production
        ```bash
        cd watchme
        npm install -g pm2
        npm run prod
        ```

#
### 2. Usage
- The application defines 2 roles: 
    - Sharer
    - Viewer

- The sharer can:
    - Define a custom room
    - Share their screen:
        - All screens
        - A specific app
        - A specific tab
    - Share system audio *(currently only working in Chromium-based browsers when sharing a tab)*
    - Share microphone audio

- The viewer can:
    - Join a room
    - Watch the sharer's screen and the audio content being shared
    - Multiple viewers can join the same room

#
### 3. Notes
- The app uses, by default, the STUN protocol to determine if a peer-to-peer connection is possible
    - The default STUN server is provided by Google at the address: `stun.l.google.com:19302`
    - You can test your STUN connectivity [here](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)

- Depending on the NAT type of the users, a TURN server might be needed to relay traffic
    - Learn more about NAT types and find out what type your network has [here](https://www.checkmynat.com/)

- Because TURN servers are used to relay traffic actively, they are usually not available for free, so you might need to deploy one yourself
    - Learn how to deploy a TURN server using coturn [here](https://gabrieltanner.org/blog/turn-server/)
    - I created a basic config for coturn, inspired by the article referenced above, [here](https://gist.github.com/axbg/c947f838387998d81664036a7beb3c27)
