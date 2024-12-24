import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Share from './pages/Share';
import View from './pages/View';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/share" element={<Share />} />
        <Route path="/view" element={<View />} />
      </Routes>
    </Router>
  );
}

export default App; 