import {useEffect, useRef} from "react";

const Video = (props) => {
    const refVideo = useRef(null);

    useEffect(() => {
        if (refVideo.current) {
            refVideo.current.srcObject = props.videoStream;
        }
    }, [props.videoStream]);

    return (
        <>
            <div className={"relative w-full " + (props.resizable ? 'p-6 justify-center' : 'max-w-2xl mt-4 mx-auto')}>
                <div className={"overflow-hidden "
                        + (props.resizable && props.isActive ? 'block w-[50vw] h-[60vh] max-w-[80vw] max-h-[90vh] min-w-[30vw] min-h-[30vh] mx-auto resize ' : 'mx-auto ')
                        + (props.isActive && 'bg-white rounded-lg shadow-lg border border-gray-200')}>
                    <video ref={refVideo} className={"w-full " + (props.resizable && 'h-full object-contain')}
                           playsInline autoPlay
                           controls={props.mode === "view" && props.isActive}
                           muted={props.mode === "share"}>
                    </video>
                    {props.mode === "share" && <div className="hidden absolute right-4 bottom-4">
                        <p className="text-white text-2xl font-semibold drop-shadow-lg">
                            stream preview
                        </p>
                    </div>}
                </div>
                {props.mode === "share" && props.isActive && (
                    <div className="text-gray-700 font-medium flex justify-end mt-4">
                        <span>Number of viewers: {props.viewersCount}</span>
                    </div>
                )}
            </div>
        </>
    )
}

export default Video;