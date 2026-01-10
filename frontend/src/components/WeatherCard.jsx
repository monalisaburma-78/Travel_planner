import React from 'react';
import { FaCloudSun, FaWind, FaTint } from 'react-icons/fa';

function WeatherCard({ location, forecast, darkMode }) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <h3 className="text-xl font-bold mb-2">{location}</h3>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Weather data not available
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
      <h3 className="text-xl font-bold mb-4">{location}</h3>
      
      <div className="space-y-4">
        {forecast.slice(0, 5).map((day, index) => (
          <div key={index} className={`p-3 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{day.date}</span>
              <FaCloudSun className="text-2xl text-yellow-500" />
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Temp:</span>
                <p className="font-semibold">{day.temp_min}° - {day.temp_max}°C</p>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Condition:</span>
                <p className="font-semibold">{day.condition}</p>
              </div>
              <div className="flex items-center space-x-2">
                <FaTint className="text-blue-500" />
                <span>{day.humidity}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaWind className="text-gray-500" />
                <span>{day.wind_speed} m/s</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeatherCard;