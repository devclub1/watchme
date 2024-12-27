import { useState } from "react";

const Video = (props) => {
    return (
        <>
            <div className="relative w-full mt-4">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <video className="w-full rounded-lg shadow-lg" autoPlay muted controls={props.mode === "view" && props.isActive}></video>

                    {props.mode === "share" && <div className="hidden absolute right-4 bottom-4">
                        <p className="text-white text-2xl font-semibold drop-shadow-lg">
                            stream preview
                        </p>
                    </div>}
                </div>
            </div>

            {props.isActive && (
                <div className="text-gray-700 font-medium flex justify-end">
                    <span>Number of viewers: {props.viewersCount}</span>
                </div>
            )}
        </>
    )
}

export default Video;