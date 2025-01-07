import Button from "../button/Button"
import logoWatchme from "../../assets/logo-watchme.png";

const Dashboard = () => {
    return (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/3">
            <div className="flex flex-col items-center justify-center">
                <img className="mb-8 w-80" src={logoWatchme} alt="logo watchme"></img>
                <div className="space-y-4">
                    <Button href="./share/" text="share your screen" />
                    <Button href="./view/" text="view someone's screen" />
                </div>
            </div>
        </div>
    )
}

export default Dashboard