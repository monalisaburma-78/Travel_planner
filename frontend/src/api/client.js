import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes for AI generation
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const generateItinerary = async (tripData) => {
  const response = await apiClient.post('/api/generate-itinerary', tripData);
  return response.data;
};

export const getTrips = async (limit = 10, offset = 0) => {
  const response = await apiClient.get('/api/trips', { params: { limit, offset } });
  return response.data;
};

export const getTrip = async (tripId) => {
  const response = await apiClient.get(`/api/trips/${tripId}`);
  return response.data;
};

export const deleteTrip = async (tripId) => {
  const response = await apiClient.delete(`/api/trips/${tripId}`);
  return response.data;
};

export const getWeather = async (location, days = 7) => {
  const response = await apiClient.get(`/api/weather/${location}`, { params: { days } });
  return response.data;
};

export const convertCurrency = async (from, to, amount = 1) => {
  const response = await apiClient.get(`/api/currency/${from}/${to}`, { params: { amount } });
  return response.data;
};

export const exportPDF = async (tripId) => {
  const response = await apiClient.post(`/api/export-pdf/${tripId}`, {}, { 
    responseType: 'blob' 
  });
  return response.data;
};

export default apiClient;