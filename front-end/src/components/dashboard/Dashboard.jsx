import Button from "../button/Button"

const Dashboard = () => {
    return (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/3">
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-8 select-none">watchme</h1>
                <div className="space-y-4">
                    <Button href="./share/" text="share your screen" />
                    <Button href="./view/" text="view someone's screen" />
                </div>
            </div>
        </div>
    )
}

export default Dashboard