"""
Enhanced Travel Planner - FastAPI Backend
Main application file with all API endpoints
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import re
import json

# Import custom services
from services.gemini_service import GeminiService
from services.weather_service import WeatherService
from services.currency_service import CurrencyService
from database import Database
from models import Trip, Itinerary

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Travel Planner API",
    description="AI-powered travel itinerary generator with modern features",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
gemini_service = GeminiService(api_key=os.getenv("GEMINI_API_KEY"))
weather_service = WeatherService(api_key=os.getenv("WEATHER_API_KEY"))
currency_service = CurrencyService()
db = Database()


# Pydantic Models for Request/Response
class TripRequest(BaseModel):
    destinations: List[str] = Field(..., min_items=1, max_items=5, description="List of destinations")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: str = Field(..., description="End date in YYYY-MM-DD format")
    trip_type: str = Field(..., description="Type of trip: adventure, relaxation, cultural, family, romantic, solo")
    budget: Optional[float] = Field(None, description="Budget in USD")
    travelers: int = Field(1, ge=1, le=20, description="Number of travelers")
    preferences: Optional[Dict] = Field(None, description="Additional preferences")


class ItineraryResponse(BaseModel):
    trip_id: str
    itinerary: Dict
    budget_breakdown: Dict
    weather_forecast: List[Dict]
    recommendations: Dict
    created_at: str

class VoiceCommandRequest(BaseModel):
    user_input: str = Field(..., description="User's voice input text")
    language: Optional[str] = Field("en", description="Language code (en, es, fr, de, hi, etc.)")

class VoiceCommandResponse(BaseModel):
    commands: List[Dict[str, Any]]
    response_text: str
    detected_language: str
    confidence: float
    
# Root endpoint
@app.get("/")
async def root():
    """API Health Check"""
    return {
        "status": "online",
        "message": "Travel Planner API v2.0",
        "endpoints": {
            "generate": "/api/generate-itinerary",
            "trips": "/api/trips",
            "weather": "/api/weather/{location}",
            "currency": "/api/currency/{from_curr}/{to_curr}",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "gemini": gemini_service.is_available(),
            "weather": weather_service.is_available(),
            "database": db.is_connected()
        }
    }


@app.post("/api/generate-itinerary", response_model=ItineraryResponse)
async def generate_itinerary(request: TripRequest):
    """
    Generate a complete travel itinerary using Gemini AI
    
    This endpoint creates a detailed day-by-day itinerary including:
    - Activities and attractions
    - Accommodation suggestions
    - Restaurant recommendations
    - Transportation details
    - Budget breakdown
    - Weather forecast
    """
    try:
        # Validate dates
        start = datetime.strptime(request.start_date, "%Y-%m-%d")
        end = datetime.strptime(request.end_date, "%Y-%m-%d")
        
        if end <= start:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        num_days = (end - start).days + 1
        
        if num_days > 30:
            raise HTTPException(status_code=400, detail="Trip duration cannot exceed 30 days")
        
        # Generate itinerary using Gemini
        itinerary_data = await gemini_service.generate_itinerary(
            destinations=request.destinations,
            num_days=num_days,
            trip_type=request.trip_type,
            budget=request.budget,
            travelers=request.travelers,
            preferences=request.preferences
        )
        
        # Get weather forecast for destinations
        weather_forecasts = []
        for destination in request.destinations:
            try:
                weather = await weather_service.get_forecast(destination, num_days)
                weather_forecasts.append({
                    "destination": destination,
                    "forecast": weather
                })
            except Exception as e:
                print(f"Weather fetch failed for {destination}: {e}")
                weather_forecasts.append({
                    "destination": destination,
                    "forecast": None,
                    "error": "Weather data unavailable"
                })
        
        # Calculate budget breakdown
        budget_breakdown = calculate_budget(
            itinerary_data,
            request.budget,
            request.travelers,
            num_days
        )
        
        # Get additional recommendations
        recommendations = await gemini_service.get_recommendations(
            destinations=request.destinations,
            trip_type=request.trip_type
        )
        
        # Save to database
        trip_id = db.save_trip(
            destinations=request.destinations,
            start_date=request.start_date,
            end_date=request.end_date,
            trip_type=request.trip_type,
            itinerary=itinerary_data,
            budget_breakdown=budget_breakdown
        )
        
        return ItineraryResponse(
            trip_id=trip_id,
            itinerary=itinerary_data,
            budget_breakdown=budget_breakdown,
            weather_forecast=weather_forecasts,
            recommendations=recommendations,
            created_at=datetime.now().isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating itinerary: {str(e)}")


@app.get("/api/trips")
async def get_trips(limit: int = 10, offset: int = 0):
    """Get all saved trips"""
    try:
        trips = db.get_trips(limit=limit, offset=offset)
        return {"trips": trips, "total": len(trips)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trips: {str(e)}")


@app.get("/api/trips/{trip_id}")
async def get_trip(trip_id: str):
    """Get a specific trip by ID"""
    try:
        trip = db.get_trip(trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        return trip
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trip: {str(e)}")


@app.delete("/api/trips/{trip_id}")
async def delete_trip(trip_id: str):
    """Delete a trip"""
    try:
        success = db.delete_trip(trip_id)
        if not success:
            raise HTTPException(status_code=404, detail="Trip not found")
        return {"message": "Trip deleted successfully", "trip_id": trip_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting trip: {str(e)}")


@app.get("/api/weather/{location}")
async def get_weather(location: str, days: int = 7):
    """Get weather forecast for a location"""
    try:
        forecast = await weather_service.get_forecast(location, days)
        return {"location": location, "forecast": forecast}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weather: {str(e)}")


@app.get("/api/currency/{from_curr}/{to_curr}")
async def convert_currency(from_curr: str, to_curr: str, amount: float = 1.0):
    """Convert currency"""
    try:
        rate = currency_service.get_rate(from_curr, to_curr)
        converted = amount * rate
        return {
            "from": from_curr,
            "to": to_curr,
            "rate": rate,
            "amount": amount,
            "converted": converted
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting currency: {str(e)}")


@app.post("/api/export-pdf/{trip_id}")
async def export_pdf(trip_id: str):
    """Export trip itinerary as PDF"""
    try:
        trip = db.get_trip(trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Generate PDF (implementation in separate service)
        from services.pdf_service import generate_pdf
        pdf_path = generate_pdf(trip)
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"itinerary_{trip_id}.pdf"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


def calculate_budget(itinerary: Dict, total_budget: Optional[float], travelers: int, days: int) -> Dict:
    """Calculate detailed budget breakdown"""
    
    # Default budget per person per day if not provided
    daily_budget = (total_budget / travelers / days) if total_budget else 150
    
    # Budget allocation percentages
    allocation = {
        "accommodation": 0.35,
        "food": 0.25,
        "activities": 0.25,
        "transportation": 0.10,
        "miscellaneous": 0.05
    }
    
    breakdown = {}
    for category, percentage in allocation.items():
        breakdown[category] = {
            "total": round(daily_budget * days * percentage * travelers, 2),
            "per_day": round(daily_budget * percentage, 2),
            "percentage": percentage * 100
        }
    
    breakdown["total"] = round(daily_budget * days * travelers, 2)
    breakdown["per_person_per_day"] = round(daily_budget, 2)
    
    return breakdown

@app.post("/api/process-voice-command", response_model=VoiceCommandResponse)
async def process_voice_command(request: VoiceCommandRequest):
    """
    Process voice command using Gemini AI with multi-language support
    
    Supports: English, Spanish, French, German, Hindi, Japanese, Chinese, Arabic, 
              Portuguese, Italian, Russian, Korean, and many more!
    """
    try:
        # Use Gemini to understand the voice command in ANY language
        prompt = f"""
You are a helpful travel planning voice assistant that understands commands in ANY language.

User said (in {request.language}): "{request.user_input}"

Extract travel planning information and respond in the SAME language the user spoke.

Analyze and extract:
1. Destinations (cities/countries mentioned)
2. Trip type (adventure, relaxation, cultural, family, romantic, solo)
3. Budget (any numbers mentioned with currency context)
4. Number of travelers/people
5. Dates (if mentioned)
6. Special preferences
7. Action requested (generate itinerary, clear form, help, etc.)

Respond with JSON in this EXACT format:
{{
  "commands": [
    {{"type": "add_destination", "value": "Paris"}},
    {{"type": "set_trip_type", "value": "romantic"}},
    {{"type": "set_budget", "value": 2000}},
    {{"type": "set_travelers", "value": 2}}
  ],
  "response_text": "I've added Paris as your destination and set this as a romantic trip for 2 people with a budget of $2000. Would you like me to generate the itinerary?",
  "detected_language": "en",
  "confidence": 0.95
}}

Command types available:
- add_destination (value: string - city name)
- set_destinations (value: array of strings - multiple cities)
- set_trip_type (value: adventure|relaxation|cultural|family|romantic|solo)
- set_budget (value: number in USD)
- set_travelers (value: number)
- set_dates (startDate: YYYY-MM-DD, endDate: YYYY-MM-DD)
- set_preferences (value: string)
- generate_itinerary (no value needed)
- clear_form (no value needed)

Important:
- If user just greets you or says hello, respond friendly with no commands
- If unclear, ask for clarification
- Response text MUST be in the same language as user input
- Be conversational and helpful
- If user wants to generate/create/plan itinerary, use generate_itinerary command
"""

        # Call Gemini AI
        response = await gemini_service.model.generate_content_async(prompt)
        
        # Parse JSON from response
        response_text = response.text.strip()
        
        # Extract JSON (handle markdown code blocks)
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            json_str = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            json_str = response_text[json_start:json_end].strip()
        elif "{" in response_text and "}" in response_text:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            json_str = response_text[json_start:json_end]
        else:
            json_str = response_text
        
        # Parse the JSON response
        try:
            ai_response = json.loads(json_str)
        except json.JSONDecodeError:
            # Fallback response if JSON parsing fails
            ai_response = {
                "commands": [],
                "response_text": "I heard you, but I'm not sure what you'd like me to do. Could you try rephrasing that?",
                "detected_language": request.language,
                "confidence": 0.5
            }
        
        return VoiceCommandResponse(
            commands=ai_response.get("commands", []),
            response_text=ai_response.get("response_text", ""),
            detected_language=ai_response.get("detected_language", request.language),
            confidence=ai_response.get("confidence", 0.9)
        )
        
    except Exception as e:
        print(f"Voice processing error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process voice command: {str(e)}"
        )


@app.get("/api/supported-languages")
async def get_supported_languages():
    """Get list of supported languages for voice assistant"""
    return {
        "languages": [
            {"code": "en", "name": "English", "native": "English"},
            {"code": "es", "name": "Spanish", "native": "Español"},
            {"code": "fr", "name": "French", "native": "Français"},
            {"code": "de", "name": "German", "native": "Deutsch"},
            {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
            {"code": "zh", "name": "Chinese", "native": "中文"},
            {"code": "ja", "name": "Japanese", "native": "日本語"},
            {"code": "ar", "name": "Arabic", "native": "العربية"},
            {"code": "pt", "name": "Portuguese", "native": "Português"},
            {"code": "it", "name": "Italian", "native": "Italiano"},
            {"code": "ru", "name": "Russian", "native": "Русский"},
            {"code": "ko", "name": "Korean", "native": "한국어"},
            {"code": "nl", "name": "Dutch", "native": "Nederlands"},
            {"code": "tr", "name": "Turkish", "native": "Türkçe"},
            {"code": "pl", "name": "Polish", "native": "Polski"},
            {"code": "vi", "name": "Vietnamese", "native": "Tiếng Việt"},
            {"code": "th", "name": "Thai", "native": "ไทย"},
            {"code": "id", "name": "Indonesian", "native": "Bahasa Indonesia"},
            {"code": "ms", "name": "Malay", "native": "Bahasa Melayu"},
            {"code": "bn", "name": "Bengali", "native": "বাংলা"},
        ],
        "note": "Gemini AI supports 100+ languages. These are the most common ones."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)