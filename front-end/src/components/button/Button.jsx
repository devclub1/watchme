import { Link } from "react-router"

const Button = (props) => {
    return (
        <button type={!!props.type ? props.type : "button"} className="block w-64 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={props.onClick} disabled={props.disabled}>
            {!!props.href
                ? <Link to={props.href} className="block w-full h-full px-6 py-3">
                    {props.text}
                </Link>
                : <div className="block w-full h-full px-6 py-3">{props.text}</div>}
        </button>
    )
}

export default Button