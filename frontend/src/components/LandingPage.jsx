// =================================================================
// FILE 19: frontend/src/components/LandingPage.jsx
// Copy everything between these markers into LandingPage.jsx
// =================================================================

import React from 'react';
import { FaRobot, FaMap, FaDollarSign, FaCloud, FaMobileAlt, FaSave } from 'react-icons/fa';

function LandingPage({ darkMode }) {
  const features = [
    {
      icon: <FaRobot className="text-4xl" />,
      title: 'AI-Powered Planning',
      description: 'Advanced Gemini AI creates personalized itineraries tailored to your preferences',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <FaMap className="text-4xl" />,
      title: 'Interactive Maps',
      description: 'Visualize your journey with integrated maps and location tracking',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <FaDollarSign className="text-4xl" />,
      title: 'Budget Tracking',
      description: 'Smart budget calculator helps you plan expenses and stay on track',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <FaCloud className="text-4xl" />,
      title: 'Weather Forecast',
      description: 'Real-time weather updates for all your destinations',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: <FaSave className="text-4xl" />,
      title: 'Save & Share',
      description: 'Save your itineraries and share them with travel companions',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: <FaMobileAlt className="text-4xl" />,
      title: 'Mobile Friendly',
      description: 'Plan your trips on any device with our responsive design',
      color: 'from-pink-500 to-rose-500'
    }
  ];

  return (
    <div className="mb-12 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-slide-up">
          Your AI Travel Companion
        </h1>
        <p className={`text-xl md:text-2xl mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-700'} animate-slide-up`} style={{animationDelay: '0.2s'}}>
          Create amazing travel itineraries in seconds with the power of AI
        </p>
        <div className="flex flex-wrap justify-center gap-4 animate-slide-up" style={{animationDelay: '0.4s'}}>
          <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-semibold">
            🆓 100% Free
          </span>
          <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full font-semibold">
            ⚡ Instant Results
          </span>
          <span className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full font-semibold">
            🤖 AI-Powered
          </span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {features.map((feature, index) => (
          <div
            key={index}
            className={`p-6 rounded-2xl transform hover:scale-105 transition-all duration-300 ${
              darkMode 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
                : 'bg-white border border-gray-100 shadow-lg'
            } animate-scale-in`}
            style={{animationDelay: `${index * 0.1}s`}}
          >
            <div className={`inline-block p-3 rounded-xl bg-gradient-to-r ${feature.color} text-white mb-4`}>
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LandingPage;


