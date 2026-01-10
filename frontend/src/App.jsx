import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaMoon, FaSun, FaPlane, FaHistory } from 'react-icons/fa';

// Components
import TripForm from './components/TripForm';
import ItineraryDisplay from './components/ItineraryDisplay';
import SavedTrips from './components/SavedTrips';
import LandingPage from './components/LandingPage';

function AppContent() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Handle trip selection from saved trips
  const handleTripSelect = (trip) => {
    setCurrentTrip(trip);
    navigate('/'); // Navigate to home to show the itinerary
  };

  // Handle "Plan Trip" click
  const handlePlanTripClick = (e) => {
    e.preventDefault();
    setCurrentTrip(null); // Clear any displayed trip
    navigate('/'); // Go to homepage
    
    // Scroll to form after navigation
    setTimeout(() => {
      const formElement = document.querySelector('form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
    }`}>
      {/* Navigation Bar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-lg ${
        darkMode ? 'bg-gray-800/80' : 'bg-white/80'
      } border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-lg`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" onClick={() => setCurrentTrip(null)} className="flex items-center space-x-2 group">
              <FaPlane className={`text-3xl ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              } group-hover:translate-x-1 transition-transform duration-300`} />
              <span className="text-2xl font-display font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                JourneyGenius
              </span>
              <span className="text-xs bg-gradient-to-r from-green-500 to-blue-500 text-white px-2 py-1 rounded-full">
                AI-Powered
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-6">
              <a
                href="/"
                onClick={handlePlanTripClick}
                className={`font-medium hover:text-blue-600 transition-colors duration-200 cursor-pointer ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Plan Trip
              </a>
              <Link 
                to="/saved-trips" 
                className={`flex items-center space-x-2 font-medium hover:text-blue-600 transition-colors duration-200 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <FaHistory />
                <span>My Trips</span>
              </Link>
              
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-all duration-300 ${
                  darkMode 
                    ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300' 
                    : 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                }`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              currentTrip ? (
                <ItineraryDisplay 
                  trip={currentTrip} 
                  darkMode={darkMode}
                  onBack={() => setCurrentTrip(null)}
                />
              ) : (
                <div className="space-y-8">
                  <LandingPage darkMode={darkMode} />
                  <TripForm 
                    onTripGenerated={setCurrentTrip}
                    darkMode={darkMode}
                    loading={loading}
                    setLoading={setLoading}
                  />
                </div>
              )
            } 
          />
          <Route 
            path="/saved-trips" 
            element={
              <SavedTrips 
                darkMode={darkMode}
                onTripSelect={handleTripSelect}
              />
            } 
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className={`mt-20 py-8 border-t ${
        darkMode ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'
      } backdrop-blur-sm`}>
        <div className="container mx-auto px-4 text-center">
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            © 2024 JourneyGenius. Powered by Google Gemini AI.
          </p>
          <p className={`mt-2 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Built with ❤️ for travelers around the world
          </p>
        </div>
      </footer>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? 'dark' : 'light'}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className={`${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4`}>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                <FaPlane className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600 text-2xl animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-center">
                Crafting Your Perfect Journey
              </h3>
              <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Our AI is designing an amazing itinerary just for you...
              </p>
              <div className="flex space-x-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;