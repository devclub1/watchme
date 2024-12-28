import Button from "../button/Button"

const Menu = (props) => {
    return (
        <div className="flex flex-col justify-around gap-4">
            <input id="channel" type="text" placeholder="Channel name" value={props.channelName} onChange={(e) => (props.setChannelName(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black" />
            {props && props.buttons && <div className="flex space-x-3">
                {props.buttons.map((button, index) => (
                    <Button
                        key={index}
                        disabled={button.disabled}
                        text={button.text}
                        onClick={button.onClick}
                    />
                ))}
            </div>}
        </div>
    )
}

export default Menu