"""
Pydantic models for data validation
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional
from datetime import datetime, date


class TripBase(BaseModel):
    """Base trip model"""
    destinations: List[str] = Field(..., min_items=1, max_items=10)
    start_date: date
    end_date: date
    trip_type: str = Field(..., description="adventure, relaxation, cultural, family, romantic, solo, business")
    
    @validator('trip_type')
    def validate_trip_type(cls, v):
        allowed_types = ['adventure', 'relaxation', 'cultural', 'family', 'romantic', 'solo', 'business']
        if v.lower() not in allowed_types:
            raise ValueError(f'trip_type must be one of: {", ".join(allowed_types)}')
        return v.lower()
    
    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class Trip(TripBase):
    """Complete trip model"""
    id: str
    budget: Optional[float] = None
    travelers: int = Field(1, ge=1, le=50)
    preferences: Optional[Dict] = None
    created_at: datetime
    updated_at: datetime


class Itinerary(BaseModel):
    """Itinerary model"""
    trip_id: str
    title: str
    overview: str
    days: List[Dict]
    packing_list: List[str] = []
    total_estimated_cost: float = 0.0


class DayPlan(BaseModel):
    """Single day plan model"""
    day: int
    date: str
    title: str
    location: str
    morning: Dict
    afternoon: Dict
    evening: Dict
    accommodation: Optional[Dict] = None
    meals: Optional[Dict] = None
    transportation: Optional[str] = None
    estimated_cost: float = 0.0
    tips: List[str] = []


class Weather(BaseModel):
    """Weather forecast model"""
    date: str
    temp_min: float
    temp_max: float
    temp_avg: float
    condition: str
    description: str
    humidity: int
    wind_speed: float
    icon: str


class BudgetBreakdown(BaseModel):
    """Budget breakdown model"""
    accommodation: Dict
    food: Dict
    activities: Dict
    transportation: Dict
    miscellaneous: Dict
    total: float
    per_person_per_day: float


class Recommendation(BaseModel):
    """Recommendation model"""
    name: str
    type: str  # attraction, restaurant, experience
    description: str
    price_range: Optional[str] = None
    rating: Optional[float] = None
    location: Optional[str] = None