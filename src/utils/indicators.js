function calculateRSI(values, period = 14) {
  if (!values || !Array.isArray(values) || values.length < period + 1) {
    return null;
  }

  const gains = [];
  const losses = [];
  
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  if (gains.length < period) {
    return null;
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const rsiValues = [];
  
  for (let i = period; i < values.length; i++) {
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    rsiValues.push(Math.round(rsi * 100) / 100);

    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
  }

  return rsiValues;
}

function calculateRSIWithDates(metricsData, period = 14) {
  if (!metricsData || !Array.isArray(metricsData) || metricsData.length < period + 1) {
    return [];
  }

  const sortedData = [...metricsData].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const values = sortedData.map(m => m.peak_live_stream_views || 0);
  const rsiValues = calculateRSI(values, period);

  if (!rsiValues || rsiValues.length === 0) {
    return [];
  }

  const result = [];
  for (let i = 0; i < rsiValues.length; i++) {
    const dataIndex = i + period;
    if (dataIndex < sortedData.length) {
      result.push({
        date: sortedData[dataIndex].date,
        rsi: rsiValues[i],
        value: sortedData[dataIndex].peak_live_stream_views
      });
    }
  }

  return result;
}

function categorizeRSI(rsi) {
  if (rsi === null || rsi === undefined) {
    return 'neutral';
  }
  
  if (rsi >= 70) {
    return 'overbought';
  } else if (rsi <= 30) {
    return 'oversold';
  }
  return 'neutral';
}

function getRSILabel(rsi) {
  if (rsi === null || rsi === undefined) {
    return 'No Data';
  }
  
  if (rsi >= 70) {
    return 'Heated/Euphoric';
  } else if (rsi <= 30) {
    return 'Cooling/Fear';
  }
  return 'Neutral';
}

module.exports = {
  calculateRSI,
  calculateRSIWithDates,
  categorizeRSI,
  getRSILabel
};
