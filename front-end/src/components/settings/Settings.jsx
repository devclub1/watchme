import { useState } from "react";
import Button from "../button/Button";
import { defaultConfigurations } from "../../data/defaults";
const Settings = (props) => {
  const [showModal, setShowModal] = useState(false);

  const addConfiguration = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newConfig = {
      urls: formData.get('urls'),
      username: formData.get('username'),
      credential: formData.get('credential')
    };

    localStorage.setItem("configurations", JSON.stringify([...props.configurations, newConfig]));
    props.setConfigurations([...props.configurations, newConfig]);
    setShowModal(false);
  }

  const removeConfiguration = (index) => {
    const newConfigurations = props.configurations.filter((_, i) => i !== index);
    localStorage.setItem("configurations", JSON.stringify(newConfigurations));
    props.setConfigurations(newConfigurations);
  }

  const resetConfigurations = () => {
    localStorage.setItem("configurations", JSON.stringify(defaultConfigurations));
    setConfigurations(defaultConfigurations);
}

  return (
    <>
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800">Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input type="checkbox"
              checked={props.systemAudio}
              onChange={() => props.setSystemAudio(!props.systemAudio)}
              className="w-4 h-4 text-black rounded focus:ring-black" />
            <label className="text-gray-700">System audio</label>
          </div>
          <div className="flex items-center space-x-2">
            <input type="checkbox"
              checked={props.micAudio}
              onChange={() => props.setMicAudio(!props.micAudio)}
              title="Microphone cannot be enabled after a stream has started"
              className="w-4 h-4 text-black rounded focus:ring-black" />
            <label className="text-gray-700" title="Microphone cannot be enabled after a stream has started">
              Microphone audio
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Configurations</h3>
          <div className="space-y-2">
            {props.configurations.map((configuration, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="space-y-1">
                  {configuration.urls && (
                    <p className="text-gray-700">urls: {configuration.urls}</p>
                  )}
                  {configuration.username && (
                    <p className="text-gray-700">username: {configuration.username}</p>
                  )}
                  {configuration.credential && (
                    <p className="text-gray-700">credential: {configuration.credential}</p>
                  )}
                </div>
                <Button 
                  text="Remove"
                  onClick={() => removeConfiguration(index)}
                />
              </div>
            ))}
          </div>
          <div className="flex space-x-3">
            <Button 
              text="Add configuration"
              onClick={() => setShowModal(true)}
            />
            <Button 
              text="Reset configuration"
              onClick={() => resetConfigurations()}
            />
          </div>
        </div>
      </div>

      {showModal && (
        <div className="p-6 rounded-lg shadow-xl backdrop:bg-gray-500/50">
          <form onSubmit={addConfiguration} className="space-y-4">
            <div className="space-y-4">
              <input required type="url" name="urls" placeholder="URL"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black" />
              <input type="text" name="username" placeholder="Username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black" />
              <input type="text" name="credential" placeholder="Credential"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black" />
            </div>
            <div className="flex space-x-3">
              <Button type="submit" text="Add" />
              <Button text="Close" onClick={() => setShowModal(false)} />
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default Settings;