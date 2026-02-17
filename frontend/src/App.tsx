import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import UserPortal from './pages/UserPortal';
import HospitalPortal from './pages/HospitalPortal';
import AmbulancePortal from './pages/AmbulancePortal';
import AmbulanceLogin from './pages/AmbulanceLogin';
import HospitalLogin from './pages/HospitalLogin';

function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        console.log("Logged in:", user.email);
      } else {
        console.log("Logged out");
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/user" element={<UserPortal />} />
        <Route path="/hospital" element={<HospitalPortal />} />
        <Route path="/hospital/login" element={<HospitalLogin />} />
        <Route path="/ambulance" element={<AmbulancePortal />} />
        <Route path="/ambulance/login" element={<AmbulanceLogin />} />
      </Routes>
    </Router>
  );
}

export default App;
