import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignOut from './components/SignOut';
import SelectUser from './pages/SelectUser';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/sign-out" element={<SignOut />} />
        <Route path="/select-user" element={<SelectUser />} />
      </Routes>
    </Router>
  );
}

export default App;