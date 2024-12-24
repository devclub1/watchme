import { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

const Share = () => {
  const [channel, setChannel] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [systemAudio, setSystemAudio] = useState(false);
  const [micAudio, setMicAudio] = useState(false);
  const [configurations, setConfigurations] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    document.title = 'watchme - share';
    
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('viewer-count', (count) => {
      setViewersCount(count);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleChannelName = (e) => {
    setChannel(e.target.value);
  };

  const startShare = async () => {
    try {
      const displayMediaOptions = {
        video: true,
        audio: systemAudio ? { supressLocalAudioPlayback: true } : false 
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      if (micAudio) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      streamRef.current = stream;
      socketRef.current?.emit('join-channel', { channel, type: 'sharer' });
      setIsSharing(true);

      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        stopShare();
      };
    } catch (err) {
      console.error('Error starting share:', err);
    }
  };

  const stopShare = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    socketRef.current?.emit('leave-channel', channel);
    setIsSharing(false);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const toggleAudio = (event, type) => {
    if (type === 'system') {
      setSystemAudio(event.target.checked);
    } else {
      setMicAudio(event.target.checked);
    }
  };

  const submitNewConfiguration = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newConfig = {
      urls: formData.get('urls'),
      username: formData.get('username'),
      credential: formData.get('credential')
    };
    setConfigurations([...configurations, newConfig]);
    setShowConfigModal(false);
  };

  const resetConfig = () => {
    setConfigurations([]);
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col space-y-4">
          <input
            id="channel"
            type="text"
            placeholder="Channel name"
            value={channel}
            onChange={handleChannelName}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
          />

          <div className="flex space-x-3">
            <button
              disabled={!channel || isSharing}
              onClick={startShare}
              className="px-6 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start share
            </button>
            <button
              disabled={!isSharing}
              onClick={stopShare}
              className="px-6 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop share
            </button>
            <button
              onClick={toggleSettings}
              className="px-6 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black"
            >
              Settings
            </button>
          </div>

          {isSharing && (
            <div className="text-gray-700 font-medium">
              <span>Number of viewers: </span>
              <span>{viewersCount}</span>
            </div>
          )}
        </div>

        {/* Video Container */}
        <div className="relative w-full max-w-2xl mt-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <video ref={videoRef} className="w-full rounded-lg shadow-lg" autoPlay muted />
            <div className="absolute right-4 bottom-4">
              <p className="text-white text-2xl font-semibold drop-shadow-lg">
                {isSharing ? '' : 'stream preview'}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Container */}
        {showSettings && (
          <div className="space-y-6 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800">Settings</h2>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={systemAudio}
                  onChange={(e) => toggleAudio(e, 'system')}
                  className="w-4 h-4 text-black rounded focus:ring-black"
                />
                <label className="text-gray-700">System audio</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={micAudio}
                  onChange={(e) => toggleAudio(e, 'mic')}
                  disabled={isSharing}
                  className="w-4 h-4 text-black rounded focus:ring-black"
                />
                <label className="text-gray-700">
                  Microphone audio
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Configurations</h3>
              <div className="space-y-2">
                {configurations.map((config, index) => (
                  <div key={index} className="p-2 border rounded">
                    <p>URL: {config.urls}</p>
                    <p>Username: {config.username}</p>
                  </div>
                ))}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="px-4 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black"
                >
                  Add configuration
                </button>
                <button
                  onClick={resetConfig}
                  className="px-4 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black"
                >
                  Reset configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <form onSubmit={submitNewConfiguration} className="space-y-4">
                <div className="space-y-4">
                  <input
                    type="text"
                    name="urls"
                    placeholder="URL"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    name="credential"
                    placeholder="Credential"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Share; 