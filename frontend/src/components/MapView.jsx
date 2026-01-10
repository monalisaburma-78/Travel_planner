import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom colored markers for different destinations
const createColoredIcon = (color, number) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 14px;
        ">${number}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

// Component to handle map centering and fitting bounds
function MapController({ locations }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations && locations.length > 0) {
      const validLocations = locations.filter(loc => loc.lat && loc.lon);
      
      if (validLocations.length === 1) {
        // Single location: center and zoom
        map.setView([validLocations[0].lat, validLocations[0].lon], 12);
      } else if (validLocations.length > 1) {
        // Multiple locations: fit all markers
        const bounds = L.latLngBounds(
          validLocations.map(loc => [loc.lat, loc.lon])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [locations, map]);
  
  return null;
}

function MapView({ destinations, darkMode }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Geocode destinations to get coordinates
  useEffect(() => {
    const geocodeDestinations = async () => {
      if (!destinations || destinations.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const geocodedLocations = await Promise.all(
          destinations.map(async (destination, index) => {
            try {
              // Using Nominatim (OpenStreetMap) geocoding API
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`
              );
              
              if (!response.ok) {
                throw new Error('Geocoding failed');
              }
              
              const data = await response.json();
              
              if (data && data.length > 0) {
                return {
                  name: destination,
                  lat: parseFloat(data[0].lat),
                  lon: parseFloat(data[0].lon),
                  displayName: data[0].display_name,
                  index: index
                };
              }
              
              return null;
            } catch (err) {
              console.error(`Failed to geocode ${destination}:`, err);
              return null;
            }
          })
        );

        const validLocations = geocodedLocations.filter(loc => loc !== null);
        setLocations(validLocations);
        
        if (validLocations.length === 0) {
          setError('Could not find locations for the specified destinations');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setError('Failed to load map locations');
      } finally {
        setLoading(false);
      }
    };

    geocodeDestinations();
  }, [destinations]);

  // Default center if no locations
  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  return (
    <div className="relative h-96 rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-white text-lg font-semibold">
            Loading map...
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
      
      <MapContainer 
        center={defaultCenter} 
        zoom={defaultZoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url={darkMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Add markers for each location */}
        {locations.map((location, index) => (
          <Marker 
            key={index}
            position={[location.lat, location.lon]}
            icon={createColoredIcon(colors[index % colors.length], index + 1)}
          >
            <Popup>
              <div className="text-center">
                <h3 className="font-bold text-lg mb-1">
                  {location.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Stop {index + 1} of {locations.length}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Auto-center and fit bounds */}
        <MapController locations={locations} />
      </MapContainer>
      
      {/* Legend */}
      {locations.length > 0 && (
        <div className={`absolute bottom-4 left-4 z-10 ${
          darkMode ? 'bg-gray-800/90' : 'bg-white/90'
        } backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-xs`}>
          <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Your Journey
          </h4>
          <div className="space-y-1">
            {locations.map((location, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: colors[index % colors.length] }}
                >
                  {index + 1}
                </div>
                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {location.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;