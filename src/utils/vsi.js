/**
 * Calculate 7-day moving average for metrics
 * @param {Array} metrics - Array of metrics objects with date and total_live_stream_views
 * @returns {Array} - Array with views_ma7 added to each metric
 */
function calculateMovingAverage7Days(metrics) {
  const sortedMetrics = [...metrics].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return sortedMetrics.map((metric, index) => {
    if (index < 6) {
      // Not enough data points for 7-day MA
      return {
        ...metric,
        views_ma7: null
      };
    }
    
    // Calculate average of last 7 days including current day
    const last7Days = sortedMetrics.slice(index - 6, index + 1);
    const ma7 = last7Days.reduce((sum, m) => sum + (m.total_live_stream_views || 0), 0) / 7;
    
    return {
      ...metric,
      views_ma7: Math.round(ma7 * 100) / 100 // Round to 2 decimal places
    };
  });
}

/**
 * Calculate VSI (Views Sentiment Indicator) for metrics
 * @param {Array} metrics - Array of metrics objects with views_ma7
 * @returns {Array} - Array with vsi and vsi_classification added to each metric
 */
function calculateVSI(metrics) {
  const metricsWithMA7 = metrics.filter(m => m.views_ma7 !== null && m.views_ma7 > 0);
  
  if (metricsWithMA7.length === 0) {
    return metrics.map(m => ({
      ...m,
      vsi: null,
      vsi_classification: null
    }));
  }
  
  // Extract all MA7 values for percentile calculation
  const ma7Values = metricsWithMA7.map(m => m.views_ma7);
  
  return metrics.map(metric => {
    if (metric.views_ma7 === null || metric.views_ma7 === 0) {
      return {
        ...metric,
        vsi: null,
        vsi_classification: null
      };
    }
    
    // Count how many values are <= current value
    const countLessOrEqual = ma7Values.filter(v => v <= metric.views_ma7).length;
    
    // Calculate percentile (0-100)
    const vsi = (countLessOrEqual / ma7Values.length) * 100;
    const roundedVSI = Math.round(vsi);
    
    // Classify the VSI
    let classification;
    if (roundedVSI <= 10) {
      classification = 'Extreme Disinterest';
    } else if (roundedVSI <= 30) {
      classification = 'Very Low Interest';
    } else if (roundedVSI <= 70) {
      classification = 'Normal Range';
    } else if (roundedVSI <= 90) {
      classification = 'High Interest';
    } else {
      classification = 'Extreme Hype';
    }
    
    return {
      ...metric,
      vsi: roundedVSI,
      vsi_classification: classification
    };
  });
}

/**
 * Calculate both MA7 and VSI for metrics
 * @param {Array} metrics - Array of metrics objects
 * @returns {Array} - Array with views_ma7, vsi, and vsi_classification added
 */
function calculateMA7AndVSI(metrics) {
  const withMA7 = calculateMovingAverage7Days(metrics);
  const withVSI = calculateVSI(withMA7);
  return withVSI;
}

/**
 * Get VSI classification color for charts
 * @param {number} vsi - VSI value (0-100)
 * @returns {string} - Color code
 */
function getVSIColor(vsi) {
  if (vsi === null || vsi === undefined) return '#999999';
  
  if (vsi <= 10) return '#006400'; // Dark Green (Extreme Buy)
  if (vsi <= 30) return '#90EE90'; // Light Green (Buy)
  if (vsi <= 70) return '#808080'; // Gray (Neutral)
  if (vsi <= 90) return '#FFB6C1'; // Light Red (Sell)
  return '#8B0000'; // Dark Red (Extreme Sell)
}

/**
 * Check for VSI signal alerts
 * @param {number} currentVSI - Current VSI value
 * @param {number} previousVSI - Previous VSI value
 * @returns {Object|null} - Signal object or null
 */
function checkVSISignal(currentVSI, previousVSI) {
  if (currentVSI === null || previousVSI === null) return null;
  
  // Check for crossover signals
  if (previousVSI <= 90 && currentVSI > 90) {
    return {
      type: 'EXTREME_HYPE',
      message: 'Extreme Hype - Potential Top',
      level: 'strong_sell',
      color: '#8B0000'
    };
  }
  
  if (previousVSI >= 10 && currentVSI < 10) {
    return {
      type: 'EXTREME_DISINTEREST',
      message: 'Extreme Disinterest - Potential Bottom',
      level: 'strong_buy',
      color: '#006400'
    };
  }
  
  if (previousVSI <= 70 && currentVSI > 70) {
    return {
      type: 'HIGH_INTEREST',
      message: 'High Interest - Consider Taking Profits',
      level: 'sell',
      color: '#FFB6C1'
    };
  }
  
  if (previousVSI >= 30 && currentVSI < 30) {
    return {
      type: 'LOW_INTEREST',
      message: 'Low Interest - Consider Accumulating',
      level: 'buy',
      color: '#90EE90'
    };
  }
  
  return null;
}

module.exports = {
  calculateMovingAverage7Days,
  calculateVSI,
  calculateMA7AndVSI,
  getVSIColor,
  checkVSISignal
};