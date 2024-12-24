# Watchme React

A React-based screen sharing application that allows users to share their screen and view others' screens in real-time.

## Features

- Screen sharing with system audio support
- Microphone audio support
- Real-time viewer count
- Fullscreen mode for viewers
- Configurable WebRTC settings
- Modern and responsive UI with TailwindCSS

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository
2. Navigate to the project directory:
   ```bash
   cd watchme-react
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Development

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Building for Production

To create a production build:

```bash
npm run build
```

The build output will be in the `dist` directory.

## Usage

1. Open the application in your browser
2. Choose between sharing your screen or viewing someone else's screen
3. For sharing:
   - Enter a channel name
   - Configure audio settings (system audio/microphone)
   - Click "Start share"
4. For viewing:
   - Enter the channel name of the stream you want to watch
   - Click "Join channel"
   - Use the fullscreen button for a better viewing experience

## Technologies Used

- React
- TypeScript
- TailwindCSS
- Socket.IO
- WebRTC
- Vite
