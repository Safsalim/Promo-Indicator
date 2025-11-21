const anomalyDetectionConfig = {
  spikeThreshold: parseFloat(process.env.ANOMALY_SPIKE_THRESHOLD) || 10.0,
  
  lookbackDays: parseInt(process.env.ANOMALY_LOOKBACK_DAYS) || 7,
  
  autoDetectionEnabled: process.env.ANOMALY_AUTO_DETECTION_ENABLED === 'true' || false,
  
  runOnCollection: process.env.ANOMALY_RUN_ON_COLLECTION === 'true' || false,
  
  scheduleCron: process.env.ANOMALY_SCHEDULE_CRON || null
};

module.exports = anomalyDetectionConfig;
