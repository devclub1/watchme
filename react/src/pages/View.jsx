import { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';

const View = () => {
  const [channel, setChannel] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [configurations, setConfigurations] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const videoRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    document.title = 'watchme - view';
    
    socketRef.current = io('http://localhost:3000');

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const handleChannelName = (e) => {
    setChannel(e.target.value);
  };

  const joinChannel = () => {
    socketRef.current?.emit('join-channel', { channel, type: 'viewer' });
    setIsJoined(true);
  };

  const closeVideo = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    socketRef.current?.emit('leave-channel', channel);
    setIsJoined(false);
  };

  const toFullscreen = () => {
    videoRef.current?.requestFullscreen();
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
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
              disabled={!channel || isJoined}
              onClick={joinChannel}
              className="px-6 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join channel
            </button>
            <button
              disabled={!isJoined}
              onClick={toFullscreen}
              className="px-6 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fullscreen
            </button>
            <button
              disabled={!isJoined}
              onClick={closeVideo}
              className="px-6 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stop video
            </button>
            <button
              onClick={toggleSettings}
              className="px-6 py-2 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative w-full justify-center">
          <div
            className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            style={{ maxWidth: '90vw', maxHeight: '90vh', minWidth: '320px', minHeight: '180px' }}
          >
            <video
              id="remoteVideo"
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              autoPlay
            />
          </div>
        </div>

        {/* Settings Container */}
        {showSettings && (
          <div className="space-y-6 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800">Configurations</h2>
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

export default View; 