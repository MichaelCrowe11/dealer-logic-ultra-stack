'use client';

import React, { useState, useEffect } from 'react';

interface ROIMetrics {
  monthlyRevenue: number;
  monthlyCost: number;
  roi: number;
  paybackPeriod: number;
  annualSavings: number;
  fiveYearValue: number;
}

export const ROICalculator: React.FC = () => {
  const [missedCalls, setMissedCalls] = useState(50);
  const [avgDealValue, setAvgDealValue] = useState(35000);
  const [conversionRate, setConversionRate] = useState(15);
  const [currentStaff, setCurrentStaff] = useState(3);
  const [avgSalary, setAvgSalary] = useState(45000);
  const [selectedTier, setSelectedTier] = useState('professional');
  const [metrics, setMetrics] = useState<ROIMetrics>({
    monthlyRevenue: 0,
    monthlyCost: 0,
    roi: 0,
    paybackPeriod: 0,
    annualSavings: 0,
    fiveYearValue: 0
  });

  const tierPrices = {
    basic: 299,
    professional: 799,
    enterprise: 2499
  };

  useEffect(() => {
    calculateROI();
  }, [missedCalls, avgDealValue, conversionRate, currentStaff, avgSalary, selectedTier]);

  const calculateROI = () => {
    const recoveredCalls = missedCalls * 0.85;
    const newDeals = (recoveredCalls * (conversionRate / 100)) / 12;
    const monthlyRevenue = newDeals * avgDealValue;
    
    const staffCostSavings = (currentStaff * avgSalary) / 12 * 0.3;
    const monthlyCost = tierPrices[selectedTier as keyof typeof tierPrices];
    
    const netMonthlyGain = monthlyRevenue + staffCostSavings - monthlyCost;
    const roi = ((netMonthlyGain / monthlyCost) * 100);
    const paybackPeriod = monthlyCost / netMonthlyGain;
    const annualSavings = netMonthlyGain * 12;
    const fiveYearValue = annualSavings * 5;

    setMetrics({
      monthlyRevenue,
      monthlyCost,
      roi,
      paybackPeriod: Math.max(0, paybackPeriod),
      annualSavings,
      fiveYearValue
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
          <h2 className="text-3xl font-bold mb-2">ROI Calculator</h2>
          <p className="text-blue-100">Calculate your return on investment with Dealer Logic</p>
        </div>

        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-4">Input Your Metrics</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Missed Calls per Month
                </label>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={missedCalls}
                  onChange={(e) => setMissedCalls(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm text-gray-600">{missedCalls} calls</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Average Deal Value
                </label>
                <input
                  type="range"
                  min="15000"
                  max="75000"
                  step="5000"
                  value={avgDealValue}
                  onChange={(e) => setAvgDealValue(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm text-gray-600">{formatCurrency(avgDealValue)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversion Rate (%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm text-gray-600">{conversionRate}%</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Staff Size
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentStaff}
                  onChange={(e) => setCurrentStaff(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm text-gray-600">{currentStaff} employees</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Tier
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="basic">Basic - $299/mo</option>
                  <option value="professional">Professional - $799/mo</option>
                  <option value="enterprise">Enterprise - $2,499/mo</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-4">Your ROI Results</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Monthly Revenue Gain</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(metrics.monthlyRevenue)}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">ROI Percentage</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.roi.toFixed(0)}%
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Payback Period</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {metrics.paybackPeriod.toFixed(1)} months
                  </p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Annual Savings</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatCurrency(metrics.annualSavings)}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-lg mt-6">
                <p className="text-sm mb-2">5-Year Total Value</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(metrics.fiveYearValue)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">How We Calculate</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 85% of missed calls recovered with AI</li>
                  <li>• Conversion based on your input rate</li>
                  <li>• 30% staff efficiency improvement</li>
                  <li>• Compound growth over time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};