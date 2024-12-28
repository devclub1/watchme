import { useEffect, useState } from "react";
import Menu from "../menu/Menu";
import Settings from "../settings/Settings";
import Video from "../video/Video";
import SharerManager from "../../sockets/SharerManager";
import ViewerManager from "../../sockets/ViewerManager";
import { defaultConfigurations } from "../../data/defaults";

const ControlBoard = (props) => {
    const [wsManager, setWsManager] = useState(null);

    const [channelName, setChannelName] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [viewersCount, setViewersCount] = useState(0);
    const [videoStream, setVideoStream] = useState(null);

    const [systemAudio, setSystemAudio] = useState(false);
    const [micAudio, setMicAudio] = useState(false);
    const [configurations, setConfigurations] = useState(JSON.parse(JSON.stringify(defaultConfigurations)));

    useEffect(() => {
        const storedConfigurations = localStorage.getItem("configurations");
        if (!!storedConfigurations) {
            setConfigurations(JSON.parse(storedConfigurations));
        }
    }, []);

    useEffect(() => {
        if (wsManager) {
            wsManager.connect(channelName, configurations, setIsActive, setVideoStream, setViewersCount, systemAudio, micAudio);
        }
    }, [wsManager]);

    const start = () => {
        switch (props.mode) {
            case "share":
                setWsManager(new SharerManager());
                break;
            case "view":
                setWsManager(new ViewerManager());
                break;
        }
    }

    const stop = () => {
        wsManager.disconnect(setIsActive, setVideoStream, setViewersCount);
        setWsManager(null);
    }

    return (
        <>
            <div className="max-w-2xl mx-auto space-y-6">
                <Menu {...{
                    channelName: channelName,
                    setChannelName: setChannelName,
                    setIsActive: setIsActive,
                    buttons: [
                        {
                            text: props.mode === "share" ? "Start share" : "Join channel",
                            onClick: start,
                            disabled: isActive || !channelName,
                        },
                        {
                            text: props.mode === "share" ? "Stop share" : "Leave channel",
                            onClick: stop,
                            disabled: !isActive,
                        },
                        {
                            text: "Settings",
                            onClick: () => setShowSettings(!showSettings),
                            disabled: isActive,
                        },
                    ]
                }} />
            </div>

            <Video mode={props.mode} isActive={isActive} videoStream={videoStream} viewersCount={viewersCount} resizable={props.mode === "view"} />

            <div className="max-w-2xl mx-auto space-y-6">
                {showSettings && (
                    <Settings {...{
                        mode: props.mode,
                        systemAudio: systemAudio,
                        setSystemAudio: setSystemAudio,
                        micAudio: micAudio,
                        setMicAudio: setMicAudio,
                        configurations: configurations,
                        setConfigurations: setConfigurations
                    }} />
                )}
            </div>
        </>
    )
}

export default ControlBoard;