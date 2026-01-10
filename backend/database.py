"""
Database handler for storing trips and itineraries
Using SQLite for simplicity (can be upgraded to PostgreSQL)
"""

import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path


class Database:
    def __init__(self, db_path: str = "travel_planner.db"):
        """Initialize database connection"""
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Create database tables if they don't exist"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Trips table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                id TEXT PRIMARY KEY,
                destinations TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                trip_type TEXT NOT NULL,
                itinerary TEXT NOT NULL,
                budget_breakdown TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_trips_created_at 
            ON trips(created_at DESC)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_trips_trip_type 
            ON trips(trip_type)
        """)
        
        conn.commit()
        conn.close()
    
    def is_connected(self) -> bool:
        """Check if database connection is working"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            conn.close()
            return True
        except:
            return False
    
    def save_trip(
        self,
        destinations: List[str],
        start_date: str,
        end_date: str,
        trip_type: str,
        itinerary: Dict,
        budget_breakdown: Dict
    ) -> str:
        """
        Save a new trip to database
        
        Returns:
            Trip ID
        """
        
        trip_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO trips (
                id, destinations, start_date, end_date, trip_type,
                itinerary, budget_breakdown, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            trip_id,
            json.dumps(destinations),
            start_date,
            end_date,
            trip_type,
            json.dumps(itinerary),
            json.dumps(budget_breakdown),
            now,
            now
        ))
        
        conn.commit()
        conn.close()
        
        return trip_id
    
    def get_trip(self, trip_id: str) -> Optional[Dict]:
        """Get a trip by ID"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, destinations, start_date, end_date, trip_type,
                   itinerary, budget_breakdown, created_at, updated_at
            FROM trips
            WHERE id = ?
        """, (trip_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return self._row_to_dict(row)
    
    def get_trips(self, limit: int = 10, offset: int = 0) -> List[Dict]:
        """Get all trips with pagination"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, destinations, start_date, end_date, trip_type,
                   itinerary, budget_breakdown, created_at, updated_at
            FROM trips
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_dict(row) for row in rows]
    
    def update_trip(self, trip_id: str, **kwargs) -> bool:
        """Update trip fields"""
        
        allowed_fields = ['destinations', 'start_date', 'end_date', 'trip_type', 
                         'itinerary', 'budget_breakdown']
        
        updates = []
        values = []
        
        for key, value in kwargs.items():
            if key in allowed_fields:
                updates.append(f"{key} = ?")
                # Convert lists and dicts to JSON
                if isinstance(value, (list, dict)):
                    value = json.dumps(value)
                values.append(value)
        
        if not updates:
            return False
        
        updates.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        values.append(trip_id)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = f"UPDATE trips SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, values)
        
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        return affected > 0
    
    def delete_trip(self, trip_id: str) -> bool:
        """Delete a trip"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM trips WHERE id = ?", (trip_id,))
        
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        return affected > 0
    
    def search_trips(self, query: str) -> List[Dict]:
        """Search trips by destination or trip type"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        search_term = f"%{query}%"
        
        cursor.execute("""
            SELECT id, destinations, start_date, end_date, trip_type,
                   itinerary, budget_breakdown, created_at, updated_at
            FROM trips
            WHERE destinations LIKE ? OR trip_type LIKE ?
            ORDER BY created_at DESC
            LIMIT 20
        """, (search_term, search_term))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_dict(row) for row in rows]
    
    def _row_to_dict(self, row) -> Dict:
        """Convert database row to dictionary"""
        
        return {
            "id": row[0],
            "destinations": json.loads(row[1]),
            "start_date": row[2],
            "end_date": row[3],
            "trip_type": row[4],
            "itinerary": json.loads(row[5]),
            "budget_breakdown": json.loads(row[6]) if row[6] else None,
            "created_at": row[7],
            "updated_at": row[8]
        }
    
    def get_stats(self) -> Dict:
        """Get database statistics"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Total trips
        cursor.execute("SELECT COUNT(*) FROM trips")
        total_trips = cursor.fetchone()[0]
        
        # Trips by type
        cursor.execute("""
            SELECT trip_type, COUNT(*) 
            FROM trips 
            GROUP BY trip_type
        """)
        trips_by_type = dict(cursor.fetchall())
        
        # Most popular destinations
        cursor.execute("SELECT destinations FROM trips")
        all_destinations = []
        for row in cursor.fetchall():
            destinations = json.loads(row[0])
            all_destinations.extend(destinations)
        
        from collections import Counter
        popular_destinations = Counter(all_destinations).most_common(10)
        
        conn.close()
        
        return {
            "total_trips": total_trips,
            "trips_by_type": trips_by_type,
            "popular_destinations": dict(popular_destinations)
        }