# Travel Planner

A modern full-stack travel planning application with AI-powered itinerary generation, weather forecasting, and budget management.



▶️ **[Quick View of Interface](assets/travel_planner_demo.mp4)**



## Features

- AI-powered travel itinerary generation using Google Gemini
- Real-time weather forecasting
- Interactive trip planning and budget tracking
- PDF export for itineraries
- Interactive maps with Leaflet
- Modern React UI with Tailwind CSS
- RESTful API backend with FastAPI
- SQLite database for data persistence

## Tech Stack

### Frontend
- React 18
- React Router for navigation
- Tailwind CSS for styling
- Framer Motion for animations
- Leaflet for maps
- Chart.js for data visualization
- Axios for API calls

### Backend
- FastAPI
- SQLAlchemy ORM
- Google Gemini AI
- SQLite database
- Pydantic for data validation

## Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development)
- Python 3.9+ (for local development)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
GEMINI_API_KEY=your_gemini_api_key
WEATHER_API_KEY=your_weather_api_key
REACT_APP_API_URL=http://localhost:8000
```

## Installation

### Using Docker (Recommended)

1. Clone the repository
2. Set up your `.env` file with required API keys
3. Run the application:

```bash
docker-compose up -d
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Local Development

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm start
```

## Usage

1. Open your browser and navigate to http://localhost
2. Create a new trip by providing destination, dates, and preferences
3. Get AI-generated itineraries and weather forecasts
4. Track your budget and expenses
5. Export your itinerary as PDF

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

## Docker Support

The application is containerized with multi-platform support:
- linux/amd64
- linux/arm64
- linux/arm/v7

> 🚧 **Deployment Status:** Not deployed yet. Deployment is currently in progress.  
> ✅ The application can be fully run locally using localhost.


## Project Structure

```
Travel_planner/
├── backend/              # FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt
│   └── ...
├── frontend/            # React frontend
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── compose.yml          # Docker Compose configuration
├── .env                 # Environment variables
└── README.md
```

## License

This project is private and proprietary.
