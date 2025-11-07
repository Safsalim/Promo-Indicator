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

function calculateVSI(ma7Data) {
  if (!ma7Data || !Array.isArray(ma7Data) || ma7Data.length === 0) {
    return [];
  }

  // Filter out null values and get valid MA7 values
  const validValues = ma7Data
    .map(item => item.views_ma7)
    .filter(value => value !== null && value !== undefined && value > 0);

  if (validValues.length === 0) {
    return ma7Data.map(item => ({
      ...item,
      vsi: null
    }));
  }

  // Calculate percentiles for normalization
  const sortedValues = [...validValues].sort((a, b) => a - b);
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const p10 = sortedValues[Math.floor(sortedValues.length * 0.1)] || min;
  const p30 = sortedValues[Math.floor(sortedValues.length * 0.3)] || min;
  const p70 = sortedValues[Math.floor(sortedValues.length * 0.7)] || max;
  const p90 = sortedValues[Math.floor(sortedValues.length * 0.9)] || max;

  // Calculate VSI for each data point
  return ma7Data.map(item => {
    if (item.views_ma7 === null || item.views_ma7 === undefined || item.views_ma7 === 0) {
      return {
        ...item,
        vsi: null
      };
    }

    const value = item.views_ma7;
    let vsi;

    // Normalize to 0-100 scale based on percentile ranges
    if (value <= p10) {
      // 0-10 range: Linear from 0 to 10
      vsi = (value / p10) * 10;
    } else if (value <= p30) {
      // 10-30 range: Linear from 10 to 30
      const ratio = (value - p10) / (p30 - p10);
      vsi = 10 + (ratio * 20);
    } else if (value <= p70) {
      // 30-70 range: Linear from 30 to 70
      const ratio = (value - p30) / (p70 - p30);
      vsi = 30 + (ratio * 40);
    } else if (value <= p90) {
      // 70-90 range: Linear from 70 to 90
      const ratio = (value - p70) / (p90 - p70);
      vsi = 70 + (ratio * 20);
    } else {
      // 90-100 range: Linear from 90 to 100
      const ratio = Math.min((value - p90) / (max - p90), 1);
      vsi = 90 + (ratio * 10);
    }

    // Clamp to 0-100 range and round to 2 decimal places
    vsi = Math.max(0, Math.min(100, vsi));
    vsi = Math.round(vsi * 100) / 100;

    return {
      ...item,
      vsi: vsi
    };
  });
}

function categorizeVSI(vsi) {
  if (vsi === null || vsi === undefined) {
    return 'normal';
  }
  
  if (vsi <= 10) {
    return 'extreme-disinterest';
  } else if (vsi <= 30) {
    return 'low-interest';
  } else if (vsi <= 70) {
    return 'normal';
  } else if (vsi <= 90) {
    return 'high-interest';
  } else {
    return 'extreme-hype';
  }
}

function getVSILabel(vsi) {
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

function getVSIColor(vsi) {
  if (vsi === null || vsi === undefined) {
    return '#9ca3af'; // Gray
  }
  
  if (vsi <= 10) {
    return '#16a34a'; // Dark Green
  } else if (vsi <= 30) {
    return '#4ade80'; // Light Green
  } else if (vsi <= 70) {
    return '#9ca3af'; // Gray
  } else if (vsi <= 90) {
    return '#fb923c'; // Orange
  } else {
    return '#dc2626'; // Dark Red
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
  categorizeVSI,
  getVSILabel,
  getVSIColor
};
