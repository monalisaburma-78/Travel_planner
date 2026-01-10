import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FaPlus, FaTimes, FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaDollarSign, FaRobot } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { generateItinerary } from '../api/client';
import VoiceAssistant from './VoiceAssistant';

const tripTypes = [
  { value: 'adventure', label: 'Adventure', emoji: '🏔️', color: 'from-orange-500 to-red-500' },
  { value: 'relaxation', label: 'Relaxation', emoji: '🏖️', color: 'from-blue-400 to-cyan-400' },
  { value: 'cultural', label: 'Cultural', emoji: '🏛️', color: 'from-purple-500 to-pink-500' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦', color: 'from-green-500 to-emerald-500' },
  { value: 'romantic', label: 'Romantic', emoji: '💑', color: 'from-pink-500 to-rose-500' },
  { value: 'solo', label: 'Solo', emoji: '🎒', color: 'from-indigo-500 to-blue-500' },
];

function TripForm({ onTripGenerated, darkMode, loading, setLoading }) {
  const [destinations, setDestinations] = useState(['']);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tripType, setTripType] = useState('');
  const [budget, setBudget] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [preferences, setPreferences] = useState('');

  const addDestination = () => {
    if (destinations.length < 5) {
      setDestinations([...destinations, '']);
    } else {
      toast.warning('Maximum 5 destinations allowed');
    }
  };

  const removeDestination = (index) => {
    if (destinations.length > 1) {
      const newDestinations = destinations.filter((_, i) => i !== index);
      setDestinations(newDestinations);
    }
  };

  const updateDestination = (index, value) => {
    const newDestinations = [...destinations];
    newDestinations[index] = value;
    setDestinations(newDestinations);
  };

  /**
   * Handle voice commands from the AI assistant
   * This function processes commands and updates the form accordingly
   */
  const handleVoiceCommand = (command) => {
    console.log('Voice command received:', command);
    
    const { type, value, startDate: voiceStartDate, endDate: voiceEndDate } = command;
    
    switch (type) {
      case 'add_destination':
        // Add single destination
        const lastDest = destinations[destinations.length - 1];
        if (lastDest === '') {
          // Replace empty destination
          updateDestination(destinations.length - 1, value);
          toast.success(`✓ Destination set to ${value}`);
        } else if (destinations.length < 5) {
          // Add new destination
          setDestinations([...destinations, value]);
          toast.success(`✓ Added ${value} to destinations`);
        } else {
          toast.warning('Maximum 5 destinations reached');
        }
        break;
        
      case 'set_destinations':
        // Set multiple destinations
        if (Array.isArray(value) && value.length > 0) {
          const dests = value.slice(0, 5); // Max 5
          setDestinations(dests);
          toast.success(`✓ Set ${dests.length} destination(s): ${dests.join(', ')}`);
        }
        break;
        
      case 'set_trip_type':
        // Set trip type
        const validType = tripTypes.find(t => t.value === value);
        if (validType) {
          setTripType(value);
          toast.success(`✓ Trip type set to ${validType.label}`);
        } else {
          toast.warning(`Unknown trip type: ${value}`);
        }
        break;
        
      case 'set_budget':
        // Set budget
        setBudget(value.toString());
        toast.success(`✓ Budget set to $${value}`);
        break;
        
      case 'set_travelers':
        // Set number of travelers
        const travelerCount = parseInt(value);
        if (travelerCount >= 1 && travelerCount <= 20) {
          setTravelers(travelerCount);
          toast.success(`✓ Number of travelers set to ${travelerCount}`);
        } else {
          toast.warning('Travelers must be between 1 and 20');
        }
        break;
        
      case 'set_dates':
        // Set start and end dates
        if (voiceStartDate) {
          const start = new Date(voiceStartDate);
          setStartDate(start);
          toast.success(`✓ Start date set to ${start.toLocaleDateString()}`);
        }
        if (voiceEndDate) {
          const end = new Date(voiceEndDate);
          setEndDate(end);
          toast.success(`✓ End date set to ${end.toLocaleDateString()}`);
        }
        break;
        
      case 'set_preferences':
        // Set preferences
        setPreferences(value);
        toast.success('✓ Preferences updated');
        break;
        
      case 'generate_itinerary':
        // Trigger form submission
        toast.info('🚀 Generating itinerary...');
        setTimeout(() => {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }, 500);
        break;
        
      case 'clear_form':
        // Clear all form fields
        setDestinations(['']);
        setStartDate(null);
        setEndDate(null);
        setTripType('');
        setBudget('');
        setTravelers(1);
        setPreferences('');
        toast.info('✓ Form cleared');
        break;
        
      default:
        console.log('Unknown command type:', type);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const validDestinations = destinations.filter(d => d.trim());
    if (validDestinations.length === 0) {
      toast.error('Please add at least one destination');
      return;
    }

    if (!startDate || !endDate) {
      toast.error('Please select travel dates');
      return;
    }

    if (!tripType) {
      toast.error('Please select a trip type');
      return;
    }

    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      toast.error('Trip duration cannot exceed 30 days');
      return;
    }

    // Prepare request data
    const tripData = {
      destinations: validDestinations,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      trip_type: tripType,
      budget: budget ? parseFloat(budget) : null,
      travelers: parseInt(travelers),
      preferences: preferences ? { notes: preferences } : null,
    };

    setLoading(true);

    try {
      const response = await generateItinerary(tripData);
      toast.success('✨ Itinerary generated successfully!');
      onTripGenerated(response);
    } catch (error) {
      console.error('Error generating itinerary:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`max-w-4xl mx-auto ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className={`rounded-3xl shadow-2xl p-8 ${
          darkMode 
            ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
            : 'bg-white border border-gray-100'
        }`}>
          {/* Header with AI Assistant Badge */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <h2 className="text-4xl font-display font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Plan Your Dream Journey
              </h2>
              <div className="relative group cursor-help">
                <div className="flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                  <FaRobot />
                  <span className="font-semibold">AI Assistant</span>
                </div>
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  Click the robot icon (bottom-right) to chat!
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </div>
            </div>
            <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Fill the form below or chat with our AI assistant to plan your trip!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Destinations */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold mb-4">
                <FaMapMarkerAlt className="text-blue-500" />
                <span>Destinations</span>
              </label>
              <div className="space-y-3">
                {destinations.map((destination, index) => (
                  <div key={index} className="flex space-x-3">
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => updateDestination(index, e.target.value)}
                      placeholder={`Destination ${index + 1} (e.g., Paris, Tokyo)`}
                      className={`flex-1 px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                    />
                    {destinations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDestination(index)}
                        className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                ))}
                {destinations.length < 5 && (
                  <button
                    type="button"
                    onClick={addDestination}
                    className={`w-full py-3 rounded-xl border-2 border-dashed transition-all ${
                      darkMode 
                        ? 'border-gray-600 hover:border-blue-500 hover:bg-gray-800' 
                        : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                    } flex items-center justify-center space-x-2`}
                  >
                    <FaPlus className="text-blue-500" />
                    <span>Add Another Destination</span>
                  </button>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold mb-4">
                  <FaCalendarAlt className="text-blue-500" />
                  <span>Start Date</span>
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  minDate={new Date()}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  placeholderText="Select start date"
                  dateFormat="MMMM d, yyyy"
                />
              </div>
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold mb-4">
                  <FaCalendarAlt className="text-blue-500" />
                  <span>End Date</span>
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  minDate={startDate || new Date()}
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  placeholderText="Select end date"
                  dateFormat="MMMM d, yyyy"
                />
              </div>
            </div>

            {/* Trip Type */}
            <div>
              <label className="text-lg font-semibold mb-4 block">
                Trip Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {tripTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTripType(type.value)}
                    className={`p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                      tripType === type.value
                        ? `bg-gradient-to-r ${type.color} text-white border-transparent shadow-lg`
                        : darkMode
                        ? 'bg-gray-700 border-gray-600 hover:border-gray-500'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{type.emoji}</div>
                    <div className="font-semibold">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget & Travelers */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold mb-4">
                  <FaDollarSign className="text-green-500" />
                  <span>Budget (USD)</span>
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="Optional"
                  min="0"
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                />
              </div>
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold mb-4">
                  <FaUsers className="text-purple-500" />
                  <span>Number of Travelers</span>
                </label>
                <input
                  type="number"
                  value={travelers}
                  onChange={(e) => setTravelers(e.target.value)}
                  min="1"
                  max="20"
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                />
              </div>
            </div>

            {/* Preferences */}
            <div>
              <label className="text-lg font-semibold mb-4 block">
                Special Preferences (Optional)
              </label>
              <textarea
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Any dietary restrictions, accessibility needs, or special interests?"
                rows="3"
                className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Generating Your Itinerary...' : '✨ Generate Itinerary'}
            </button>
          </form>
        </div>
      </div>

      {/* Voice Assistant Component - ChatGPT Style! */}
      <VoiceAssistant 
        darkMode={darkMode} 
        onVoiceCommand={handleVoiceCommand}
      />
    </>
  );
}

export default TripForm;