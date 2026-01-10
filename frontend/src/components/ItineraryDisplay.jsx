import React, { useState } from 'react';
import { FaArrowLeft, FaDownload, FaCalendarAlt, FaMapMarkerAlt, FaDollarSign, FaCloudSun } from 'react-icons/fa';
import { toast } from 'react-toastify';
import MapView from './MapView';
import BudgetCalculator from './BudgetCalculator';
import WeatherCard from './WeatherCard';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ItineraryDisplay({ trip, darkMode, onBack }) {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [downloading, setDownloading] = useState(false);

  const itinerary = trip.itinerary || {};
  const days = itinerary.days || [];

  const handleDownloadPDF = async () => {
    if (!trip.trip_id) {
      toast.error('Trip ID not found');
      return;
    }

    setDownloading(true);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/export-pdf/${trip.trip_id}`,
        {},
        {
          responseType: 'blob',
          timeout: 30000
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `itinerary_${trip.trip_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const tabs = [
    { id: 'itinerary', label: 'Itinerary', icon: <FaCalendarAlt /> },
    { id: 'map', label: 'Map', icon: <FaMapMarkerAlt /> },
    { id: 'budget', label: 'Budget', icon: <FaDollarSign /> },
    { id: 'weather', label: 'Weather', icon: <FaCloudSun /> },
  ];

  return (
    <div className={`max-w-6xl mx-auto ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className={`rounded-3xl shadow-2xl p-8 mb-6 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
          : 'bg-white border border-gray-100'
      }`}>
        <button
          onClick={onBack}
          className={`mb-6 flex items-center space-x-2 ${
            darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
          } transition-colors`}
        >
          <FaArrowLeft />
          <span>Back to Planning</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {itinerary.title || 'Your Travel Itinerary'}
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {itinerary.overview || 'Your personalized travel plan'}
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className={`mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center space-x-2 ${
              downloading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FaDownload className={downloading ? 'animate-bounce' : ''} />
            <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`rounded-2xl shadow-lg mb-6 overflow-hidden ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 font-semibold transition-all flex items-center justify-center space-x-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className={`rounded-3xl shadow-2xl p-8 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
          : 'bg-white border border-gray-100'
      }`}>
        {activeTab === 'itinerary' && (
          <div className="space-y-8">
            {days.length > 0 ? (
              days.map((day, index) => (
                <div key={index} className={`p-6 rounded-2xl ${
                  darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {day.day}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{day.title || `Day ${day.day}`}</h3>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {day.location || day.date}
                      </p>
                    </div>
                  </div>
                  
                  {day.description && (
                    <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {day.description}
                    </p>
                  )}

                  {day.activities && day.activities.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Activities:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {day.activities.map((activity, i) => (
                          <li key={i} className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {itinerary.raw_response || 'No detailed itinerary available'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <MapView destinations={trip.destinations || []} darkMode={darkMode} />
        )}

        {activeTab === 'budget' && (
          <BudgetCalculator 
            budgetBreakdown={trip.budget_breakdown} 
            darkMode={darkMode}
          />
        )}

        {activeTab === 'weather' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trip.weather_forecast && trip.weather_forecast.length > 0 ? (
              trip.weather_forecast.map((location, index) => (
                <WeatherCard 
                  key={index}
                  location={location.destination}
                  forecast={location.forecast}
                  darkMode={darkMode}
                />
              ))
            ) : (
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                Weather data not available
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ItineraryDisplay;