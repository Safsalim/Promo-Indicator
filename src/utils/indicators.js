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

  const values = sortedData.map(m => m.total_live_stream_views || 0);
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
        value: sortedData[dataIndex].total_live_stream_views
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

function calculate7DayMovingAverage(valuesArray) {
  if (!valuesArray || !Array.isArray(valuesArray) || valuesArray.length === 0) {
    return [];
  }

  const ma = [];
  for (let i = 0; i < valuesArray.length; i++) {
    if (i < 6) {
      ma.push(null);
    } else {
      const sum = valuesArray.slice(i - 6, i + 1).reduce((a, b) => {
        return (a || 0) + (b || 0);
      }, 0);
      const average = sum / 7;
      ma.push(Math.round(average * 100) / 100);
    }
  }
  return ma;
}

function calculateMA7WithDates(metricsData) {
  if (!metricsData || !Array.isArray(metricsData) || metricsData.length === 0) {
    return [];
  }

  const sortedData = [...metricsData].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const values = sortedData.map(m => m.total_live_stream_views || 0);
  const maValues = calculate7DayMovingAverage(values);

  const result = [];
  for (let i = 0; i < sortedData.length; i++) {
    result.push({
      date: sortedData[i].date,
      views_ma7: maValues[i]
    });
  }

  return result;
}

function calculateVSI(ma7Values) {
  if (!ma7Values || !Array.isArray(ma7Values) || ma7Values.length === 0) {
    return [];
  }

  // Filter out null values for percentile calculation
  const validValues = ma7Values.filter(v => v !== null);
  
  if (validValues.length === 0) {
    return ma7Values.map(() => null);
  }

  // Calculate VSI for each day
  return ma7Values.map(todayMA7 => {
    if (todayMA7 === null) {
      return null;
    }
    
    // Count how many values are <= today's value
    const countLessOrEqual = validValues.filter(v => v <= todayMA7).length;
    
    // Calculate percentile: (count / total) * 100
    const vsi = (countLessOrEqual / validValues.length) * 100;
    
    return Math.round(vsi);
  });
}

function calculateVSIWithDates(metricsData) {
  if (!metricsData || !Array.isArray(metricsData) || metricsData.length === 0) {
    return [];
  }

  const sortedData = [...metricsData].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  // First calculate MA7 values
  const ma7Data = calculateMA7WithDates(sortedData);
  const ma7Values = ma7Data.map(d => d.views_ma7);
  
  // Then calculate VSI based on MA7 values
  const vsiValues = calculateVSI(ma7Values);

  const result = [];
  for (let i = 0; i < sortedData.length; i++) {
    result.push({
      date: sortedData[i].date,
      views_ma7: ma7Values[i],
      vsi: vsiValues[i],
      vsi_classification: getVSIClassification(vsiValues[i])
    });
  }

  return result;
}

function getVSIClassification(vsi) {
  if (vsi === null || vsi === undefined) {
    return 'No Data';
  }
  
  if (vsi <= 10) {
    return 'Extreme Disinterest';
  } else if (vsi <= 30) {
    return 'Low Interest';
  } else if (vsi <= 70) {
    return 'Normal';
  } else if (vsi <= 90) {
    return 'High Interest';
  } else {
    return 'Extreme Hype';
  }
}

module.exports = {
  calculateRSI,
  calculateRSIWithDates,
  categorizeRSI,
  getRSILabel,
  calculate7DayMovingAverage,
  calculateMA7WithDates,
  calculateVSI,
  calculateVSIWithDates,
  getVSIClassification
};
