const Footer = () => {
    return (
        <div className="mx-auto py-4 text-center text-black text-sm group">
            <div className="relative inline-block">
                <span className="transition-opacity duration-1000 group-hover:opacity-0">//</span>
                <div className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap cursor-default opacity-0 transition-opacity duration-1000 group-hover:opacity-100">
                    <a href="https://github.com/devclub1" target="_blank" className="hover:text-gray-600">developed // devclub1</a>
                </div>
            </div>
        </div>
    )
}

export default Footer