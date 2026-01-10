"""
Gemini AI Service for generating travel itineraries
Using Google's Gemini API (free tier available)
"""

import google.generativeai as genai
from typing import List, Dict, Optional
import json
import asyncio
from functools import lru_cache


class GeminiService:
    def __init__(self, api_key: str):
        """Initialize Gemini service with API key"""
        if not api_key:
            raise ValueError("Gemini API key is required")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
    def is_available(self) -> bool:
        """Check if Gemini service is available"""
        try:
            # Try a simple test generation
            response = self.model.generate_content("Test")
            return True
        except:
            return False
    
    async def generate_itinerary(
        self,
        destinations: List[str],
        num_days: int,
        trip_type: str,
        budget: Optional[float] = None,
        travelers: int = 1,
        preferences: Optional[Dict] = None
    ) -> Dict:
        """
        Generate a detailed travel itinerary using Gemini AI
        
        Args:
            destinations: List of destination names
            num_days: Number of days for the trip
            trip_type: Type of trip (adventure, relaxation, cultural, etc.)
            budget: Optional budget in USD
            travelers: Number of travelers
            preferences: Additional user preferences
        
        Returns:
            Dictionary containing the complete itinerary
        """
        
        # Build the prompt
        prompt = self._build_itinerary_prompt(
            destinations, num_days, trip_type, budget, travelers, preferences
        )
        
        try:
            # Generate content using Gemini
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            # Parse the response
            itinerary = self._parse_itinerary_response(response.text)
            
            return itinerary
            
        except Exception as e:
            raise Exception(f"Failed to generate itinerary: {str(e)}")
    
    async def get_recommendations(
        self,
        destinations: List[str],
        trip_type: str
    ) -> Dict:
        """
        Get additional recommendations for destinations
        
        Returns:
            Dictionary with restaurants, activities, and tips
        """
        
        prompt = f"""
        Provide recommendations for a {trip_type} trip to {', '.join(destinations)}.
        Include:
        1. Top 5 must-visit attractions
        2. 5 recommended restaurants (with cuisine type and price range)
        3. 5 unique local experiences
        4. Important travel tips
        5. Best time to visit each location
        
        Format the response as JSON with keys: attractions, restaurants, experiences, tips, best_times
        """
        
        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            # Try to parse as JSON, fallback to structured text
            try:
                recommendations = json.loads(self._extract_json(response.text))
            except:
                recommendations = self._parse_recommendations_text(response.text)
            
            return recommendations
            
        except Exception as e:
            return {
                "error": f"Failed to get recommendations: {str(e)}",
                "attractions": [],
                "restaurants": [],
                "experiences": [],
                "tips": [],
                "best_times": {}
            }
    
    def _build_itinerary_prompt(
        self,
        destinations: List[str],
        num_days: int,
        trip_type: str,
        budget: Optional[float],
        travelers: int,
        preferences: Optional[Dict]
    ) -> str:
        """Build detailed prompt for itinerary generation"""
        
        budget_text = f"with a budget of ${budget} USD for {travelers} traveler(s)" if budget else "budget-flexible"
        pref_text = f"\nSpecial preferences: {json.dumps(preferences)}" if preferences else ""
        
        prompt = f"""
        Create a detailed {num_days}-day travel itinerary for a {trip_type} trip to {', '.join(destinations)}.
        
        Trip Details:
        - Destinations: {', '.join(destinations)}
        - Duration: {num_days} days
        - Trip Type: {trip_type}
        - Budget: {budget_text}
        - Number of travelers: {travelers}{pref_text}
        
        For each day, provide:
        1. Day number and title
        2. Morning activities (with timing)
        3. Afternoon activities (with timing)
        4. Evening activities (with timing)
        5. Recommended accommodation (name, type, estimated price per night)
        6. Recommended restaurants for meals (breakfast, lunch, dinner with cuisine type)
        7. Transportation suggestions
        8. Estimated daily cost
        9. Insider tips and warnings
        
        Format the response as JSON with the following structure:
        {{
            "title": "Trip title",
            "overview": "Brief overview of the trip",
            "days": [
                {{
                    "day": 1,
                    "date": "Day 1",
                    "title": "Day title",
                    "location": "Primary location for the day",
                    "morning": {{
                        "time": "9:00 AM - 12:00 PM",
                        "activities": ["Activity 1", "Activity 2"],
                        "description": "Detailed description"
                    }},
                    "afternoon": {{
                        "time": "12:00 PM - 5:00 PM",
                        "activities": ["Activity 1", "Activity 2"],
                        "description": "Detailed description"
                    }},
                    "evening": {{
                        "time": "5:00 PM - 10:00 PM",
                        "activities": ["Activity 1", "Activity 2"],
                        "description": "Detailed description"
                    }},
                    "accommodation": {{
                        "name": "Hotel name",
                        "type": "Hotel/Hostel/Airbnb",
                        "price": 100,
                        "description": "Brief description"
                    }},
                    "meals": {{
                        "breakfast": {{"name": "Restaurant", "cuisine": "Type", "price": 15}},
                        "lunch": {{"name": "Restaurant", "cuisine": "Type", "price": 25}},
                        "dinner": {{"name": "Restaurant", "cuisine": "Type", "price": 40}}
                    }},
                    "transportation": "Transportation details for the day",
                    "estimated_cost": 200,
                    "tips": ["Tip 1", "Tip 2"]
                }}
            ],
            "packing_list": ["Item 1", "Item 2", "Item 3"],
            "total_estimated_cost": 5000
        }}
        
        Make it exciting, practical, and culturally rich!
        """
        
        return prompt
    
    def _parse_itinerary_response(self, response_text: str) -> Dict:
        """Parse Gemini's response into structured itinerary"""
        
        try:
            # Try to extract JSON from response
            json_text = self._extract_json(response_text)
            itinerary = json.loads(json_text)
            return itinerary
        except:
            # Fallback: create basic structure from text
            return {
                "title": "Your Travel Itinerary",
                "overview": response_text[:500],
                "days": self._parse_days_from_text(response_text),
                "packing_list": ["Passport", "Comfortable shoes", "Camera", "Sunscreen"],
                "total_estimated_cost": 0,
                "raw_response": response_text
            }
    
    def _extract_json(self, text: str) -> str:
        """Extract JSON from markdown code blocks or text"""
        
        # Try to find JSON in code blocks
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            return text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            return text[start:end].strip()
        
        # Try to find JSON object
        if "{" in text and "}" in text:
            start = text.find("{")
            end = text.rfind("}") + 1
            return text[start:end]
        
        return text
    
    def _parse_days_from_text(self, text: str) -> List[Dict]:
        """Parse day information from unstructured text"""
        
        days = []
        lines = text.split('\n')
        current_day = None
        
        for line in lines:
            line = line.strip()
            if line.lower().startswith('day '):
                if current_day:
                    days.append(current_day)
                current_day = {
                    "day": len(days) + 1,
                    "title": line,
                    "description": "",
                    "activities": []
                }
            elif current_day:
                current_day["description"] += line + " "
        
        if current_day:
            days.append(current_day)
        
        return days if days else [{"day": 1, "title": "Day 1", "description": text}]
    
    def _parse_recommendations_text(self, text: str) -> Dict:
        """Parse recommendations from text format"""
        
        return {
            "attractions": self._extract_list_from_text(text, "attractions"),
            "restaurants": self._extract_list_from_text(text, "restaurants"),
            "experiences": self._extract_list_from_text(text, "experiences"),
            "tips": self._extract_list_from_text(text, "tips"),
            "best_times": {},
            "raw_text": text
        }
    
    def _extract_list_from_text(self, text: str, section: str) -> List[str]:
        """Extract list items from text"""
        
        items = []
        lines = text.lower().split('\n')
        in_section = False
        
        for line in lines:
            if section.lower() in line:
                in_section = True
                continue
            if in_section:
                if line.strip().startswith(('-', '*', '•', '1.', '2.', '3.')):
                    items.append(line.strip().lstrip('-*•0123456789. '))
                elif line and not line[0].isspace():
                    in_section = False
        
        return items[:5] if items else []