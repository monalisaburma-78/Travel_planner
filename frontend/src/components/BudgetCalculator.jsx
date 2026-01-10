import React, { useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { FaDollarSign, FaPoundSign, FaRupeeSign } from 'react-icons/fa';

ChartJS.register(ArcElement, Tooltip, Legend);

// Currency conversion rates (you can fetch these from an API in production)
const EXCHANGE_RATES = {
  USD: 1,
  GBP: 0.79,    // 1 USD = 0.79 GBP
  INR: 83.12     // 1 USD = 83.12 INR
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  GBP: '£',
  INR: '₹'
};

const CURRENCY_ICONS = {
  USD: <FaDollarSign />,
  GBP: <FaPoundSign />,
  INR: <FaRupeeSign />
};

function BudgetCalculator({ budgetBreakdown, darkMode }) {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  if (!budgetBreakdown) {
    return (
      <div className="text-center py-12">
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          No budget information available
        </p>
      </div>
    );
  }

  // Convert amount from USD to selected currency
  const convertCurrency = (amountInUSD) => {
    const rate = EXCHANGE_RATES[selectedCurrency];
    return (amountInUSD * rate).toFixed(2);
  };

  const formatCurrency = (amount) => {
    const converted = convertCurrency(amount);
    return `${CURRENCY_SYMBOLS[selectedCurrency]}${parseFloat(converted).toLocaleString()}`;
  };

  const categories = ['accommodation', 'food', 'activities', 'transportation', 'miscellaneous'];
  
  const chartData = {
    labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
    datasets: [{
      data: categories.map(c => budgetBreakdown[c]?.total || 0),
      backgroundColor: [
        '#3b82f6',
        '#8b5cf6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
      ],
      borderWidth: 0,
    }]
  };

  const options = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: darkMode ? '#fff' : '#000',
          padding: 20,
          font: { size: 14 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.parsed || 0;
            label += formatCurrency(value);
            return label;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Currency Selector */}
      <div className="flex justify-center">
        <div className={`inline-flex rounded-xl overflow-hidden shadow-lg ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {Object.keys(EXCHANGE_RATES).map((currency) => (
            <button
              key={currency}
              onClick={() => setSelectedCurrency(currency)}
              className={`px-6 py-3 font-semibold transition-all flex items-center space-x-2 ${
                selectedCurrency === currency
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : darkMode
                  ? 'text-gray-300 hover:bg-gray-600'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {CURRENCY_ICONS[currency]}
              <span>{currency}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Exchange Rate Info */}
      {selectedCurrency !== 'USD' && (
        <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Exchange rate: 1 USD = {EXCHANGE_RATES[selectedCurrency]} {selectedCurrency}
        </div>
      )}

      {/* Chart */}
      <div className="max-w-md mx-auto">
        <Doughnut data={chartData} options={options} />
      </div>

      {/* Category Breakdown */}
      <div className="grid md:grid-cols-2 gap-4 mt-8">
        {categories.map((category) => {
          const data = budgetBreakdown[category];
          if (!data) return null;

          return (
            <div key={category} className={`p-4 rounded-xl ${
              darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <h4 className="font-semibold text-lg mb-2 capitalize">{category}</h4>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(data.total)}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatCurrency(data.per_day)} per day ({data.percentage}%)
              </p>
            </div>
          );
        })}
      </div>

      {/* Total Budget Summary */}
      <div className={`p-6 rounded-xl text-center ${
        darkMode ? 'bg-gradient-to-r from-blue-900 to-purple-900' : 'bg-gradient-to-r from-blue-100 to-purple-100'
      }`}>
        <p className="text-lg font-semibold mb-2">Total Budget</p>
        <p className="text-4xl font-bold text-blue-600">
          {formatCurrency(budgetBreakdown.total)}
        </p>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {formatCurrency(budgetBreakdown.per_person_per_day)} per person per day
        </p>
      </div>

      {/* Currency Disclaimer */}
      <div className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
        * Exchange rates are approximate and for reference only. Actual rates may vary.
      </div>
    </div>
  );
}

export default BudgetCalculator;