import React, { useState, useEffect } from 'react';
import { FaTrash, FaEye, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getTrips, deleteTrip } from '../api/client';

function SavedTrips({ darkMode, onTripSelect }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const data = await getTrips(20, 0);
      setTrips(data.trips || []);
    } catch (error) {
      toast.error('Failed to load trips');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tripId) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await deleteTrip(tripId);
        toast.success('Trip deleted successfully');
        loadTrips();
      } catch (error) {
        toast.error('Failed to delete trip');
        console.error(error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      <h1 className="text-4xl font-display font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        My Saved Trips
      </h1>

      {trips.length === 0 ? (
        <div className={`text-center py-16 rounded-3xl ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
        }`}>
          <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No saved trips yet. Start planning your first adventure!
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className={`rounded-2xl p-6 transform hover:scale-105 transition-all duration-300 ${
                darkMode 
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
                  : 'bg-white border border-gray-100 shadow-lg'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                    'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  }`}>
                    {trip.trip_type}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-bold mb-2">
                {trip.destinations.join(', ')}
              </h3>

              <div className={`space-y-2 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div className="flex items-center space-x-2">
                  <FaCalendarAlt className="text-blue-500" />
                  <span>{trip.start_date} to {trip.end_date}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaMapMarkerAlt className="text-purple-500" />
                  <span>{trip.destinations.length} destination(s)</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => onTripSelect(trip)}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center space-x-2"
                >
                  <FaEye />
                  <span>View</span>
                </button>
                <button
                  onClick={() => handleDelete(trip.id)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedTrips;