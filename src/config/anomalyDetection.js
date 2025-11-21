const anomalyDetectionConfig = {
  spikeThreshold: parseFloat(process.env.ANOMALY_SPIKE_THRESHOLD) || 11.0,
  
  baselineDays: parseInt(process.env.ANOMALY_BASELINE_DAYS) || 7,
  
  minBaselineDays: parseInt(process.env.ANOMALY_MIN_BASELINE_DAYS) || 3,
  
  autoDetectionEnabled: process.env.ANOMALY_AUTO_DETECTION_ENABLED === 'true' || false,
  
  runOnCollection: process.env.ANOMALY_RUN_ON_COLLECTION === 'true' || false,
  
  scheduleCron: process.env.ANOMALY_SCHEDULE_CRON || null
};

module.exports = anomalyDetectionConfig;
