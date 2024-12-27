import "./container.css"

import Dashboard from "../dashboard/Dashboard"

import { BrowserRouter, Route, Routes } from "react-router"
import Footer from "../footer/Footer"
import SharerBoard from "../sharer-board/SharerBoard"

const Container = () => {
    return (
        <div className="bg-gray-50 min-h-screen flex flex-col">
            <div className="flex flex-col flex-grow items-center">
                <BrowserRouter>
                    <Routes>
                        <Route key="dashboard" path="/" element={<Dashboard />} />
                        <Route key="share" path="/share/*" element={<SharerBoard mode="share" />} />
                        <Route key="view" path="/view/*" element={<SharerBoard mode="view" />} />
                    </Routes>
                </BrowserRouter>
            </div>
            <Footer />
        </div>
    )
}

export default Container