"""
Currency Conversion Service
Uses exchangerate-api.com (free tier, no API key required)
"""

import httpx
from typing import Dict, Optional
from functools import lru_cache
from datetime import datetime, timedelta


class CurrencyService:
    def __init__(self):
        """Initialize currency service"""
        self.base_url = "https://api.exchangerate-api.com/v4/latest"
        self._cache = {}
        self._cache_duration = timedelta(hours=1)
    
    @lru_cache(maxsize=100)
    def get_rate(self, from_currency: str, to_currency: str) -> float:
        """
        Get exchange rate between two currencies
        
        Args:
            from_currency: Source currency code (e.g., 'USD')
            to_currency: Target currency code (e.g., 'EUR')
        
        Returns:
            Exchange rate as float
        """
        
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        if from_currency == to_currency:
            return 1.0
        
        # Check cache
        cache_key = f"{from_currency}_{to_currency}"
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if datetime.now() - timestamp < self._cache_duration:
                return cached_data
        
        try:
            # Fetch rates
            rates = self._fetch_rates(from_currency)
            
            if to_currency in rates:
                rate = rates[to_currency]
                self._cache[cache_key] = (rate, datetime.now())
                return rate
            else:
                raise ValueError(f"Currency {to_currency} not found")
                
        except Exception as e:
            print(f"Currency conversion error: {e}")
            # Return fallback rates for common conversions
            return self._get_fallback_rate(from_currency, to_currency)
    
    def _fetch_rates(self, base_currency: str) -> Dict[str, float]:
        """Fetch exchange rates from API"""
        
        try:
            with httpx.Client() as client:
                response = client.get(f"{self.base_url}/{base_currency}", timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return data.get("rates", {})
        except Exception as e:
            print(f"Failed to fetch rates: {e}")
            return {}
    
    def _get_fallback_rate(self, from_curr: str, to_curr: str) -> float:
        """Fallback exchange rates for common currency pairs"""
        
        # Approximate rates (as of 2024)
        fallback_rates = {
            "USD_EUR": 0.92,
            "USD_GBP": 0.79,
            "USD_JPY": 149.0,
            "USD_INR": 83.0,
            "USD_CAD": 1.36,
            "USD_AUD": 1.52,
            "EUR_USD": 1.09,
            "EUR_GBP": 0.86,
            "GBP_USD": 1.27,
            "GBP_EUR": 1.16,
        }
        
        key = f"{from_curr}_{to_curr}"
        if key in fallback_rates:
            return fallback_rates[key]
        
        # Try reverse rate
        reverse_key = f"{to_curr}_{from_curr}"
        if reverse_key in fallback_rates:
            return 1.0 / fallback_rates[reverse_key]
        
        # Default to 1.0 if no rate found
        return 1.0
    
    def convert(self, amount: float, from_currency: str, to_currency: str) -> Dict:
        """
        Convert amount from one currency to another
        
        Returns:
            Dictionary with conversion details
        """
        
        rate = self.get_rate(from_currency, to_currency)
        converted_amount = amount * rate
        
        return {
            "original_amount": amount,
            "original_currency": from_currency,
            "converted_amount": round(converted_amount, 2),
            "converted_currency": to_currency,
            "exchange_rate": rate,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_multiple_rates(self, base_currency: str, target_currencies: list) -> Dict:
        """Get rates for multiple currencies at once"""
        
        rates = {}
        for currency in target_currencies:
            try:
                rates[currency] = self.get_rate(base_currency, currency)
            except Exception as e:
                print(f"Failed to get rate for {currency}: {e}")
                rates[currency] = None
        
        return rates