import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const Home = () => {
  useEffect(() => {
    document.title = 'watchme - dashboard';
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center space-y-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">watchme</h1>
          
          <div className="space-y-4">
            <Link to="/share" 
              className="block w-64 px-6 py-3 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black">
              share your screen
            </Link>
            
            <Link to="/view" 
              className="block w-64 px-6 py-3 text-white bg-black rounded-lg hover:bg-white hover:text-black transition-colors duration-200 shadow-md border border-black">
              view someone's screen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 