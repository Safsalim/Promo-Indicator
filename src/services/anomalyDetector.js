const LiveStreamMetrics = require('../models/LiveStreamMetrics');
const Channel = require('../models/Channel');

const DEFAULT_SPIKE_THRESHOLD = 10.0;
const DEFAULT_LOOKBACK_DAYS = 7;

class AnomalyDetector {
  constructor(config = {}) {
    this.spikeThreshold = config.spikeThreshold || DEFAULT_SPIKE_THRESHOLD;
    this.lookbackDays = config.lookbackDays || DEFAULT_LOOKBACK_DAYS;
    this.dryRun = config.dryRun || false;
  }

  findPreviousNonExcludedDay(metrics, currentIndex) {
    for (let i = currentIndex - 1; i >= Math.max(0, currentIndex - this.lookbackDays); i--) {
      const metric = metrics[i];
      if ((!metric.is_excluded || metric.is_excluded === 0) && metric.total_live_stream_views > 0) {
        return metric;
      }
    }
    return null;
  }

  detectAnomaliesForChannel(channelId, startDate = null, endDate = null) {
    const channel = Channel.findById(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    let metrics;
    if (startDate && endDate) {
      metrics = LiveStreamMetrics.findByChannelIdAndDateRange(channelId, startDate, endDate);
    } else {
      metrics = LiveStreamMetrics.findByChannelId(channelId);
    }

    if (metrics.length === 0) {
      return {
        channel: channel,
        anomalies: [],
        checked: 0,
        excluded: 0
      };
    }

    metrics.sort((a, b) => a.date.localeCompare(b.date));

    const anomalies = [];
    const excluded = [];

    for (let i = 0; i < metrics.length; i++) {
      const currentMetric = metrics[i];
      
      if (currentMetric.is_excluded && currentMetric.exclusion_reason === 'auto_anomaly_detection') {
        continue;
      }

      const previousMetric = this.findPreviousNonExcludedDay(metrics, i);
      
      if (!previousMetric) {
        continue;
      }

      const previousViews = previousMetric.total_live_stream_views;
      const currentViews = currentMetric.total_live_stream_views;
      
      if (previousViews === 0) {
        continue;
      }

      const ratio = currentViews / previousViews;

      if (ratio > this.spikeThreshold) {
        const percentageIncrease = ((ratio - 1) * 100).toFixed(1);
        
        const anomaly = {
          id: currentMetric.id,
          channel_id: channelId,
          channel_name: channel.channel_name,
          channel_handle: channel.channel_handle,
          date: currentMetric.date,
          views: currentViews,
          previous_day: previousMetric.date,
          previous_views: previousViews,
          ratio: ratio.toFixed(2),
          percentage_increase: percentageIncrease,
          metadata: {
            previous_day: previousMetric.date,
            previous_views: previousViews,
            spike_threshold: this.spikeThreshold,
            detection_time: new Date().toISOString()
          }
        };

        anomalies.push(anomaly);

        if (!this.dryRun) {
          try {
            LiveStreamMetrics.excludeById(
              currentMetric.id,
              'auto_anomaly_detection',
              anomaly.metadata
            );
            excluded.push(anomaly);
            console.log(`[AnomalyDetector] Auto-excluded: ${channel.channel_handle} on ${currentMetric.date} - ${currentViews} views (${percentageIncrease}% increase from ${previousViews} on ${previousMetric.date}, ratio: ${ratio.toFixed(2)}x)`);
          } catch (error) {
            console.error(`[AnomalyDetector] Failed to exclude metric ${currentMetric.id}:`, error.message);
          }
        }
      }
    }

    return {
      channel: channel,
      anomalies: anomalies,
      checked: metrics.length,
      excluded: excluded.length
    };
  }

  detectAnomaliesForAllChannels(startDate = null, endDate = null) {
    const channels = Channel.findActive();
    
    if (channels.length === 0) {
      console.log('[AnomalyDetector] No active channels found');
      return {
        channels: [],
        total_anomalies: 0,
        total_excluded: 0,
        total_checked: 0
      };
    }

    const results = [];
    let totalAnomalies = 0;
    let totalExcluded = 0;
    let totalChecked = 0;

    console.log(`[AnomalyDetector] Starting anomaly detection for ${channels.length} channels...`);
    console.log(`[AnomalyDetector] Configuration: spike_threshold=${this.spikeThreshold}x (${(this.spikeThreshold - 1) * 100}% increase), lookback_days=${this.lookbackDays}, dry_run=${this.dryRun}`);

    channels.forEach(channel => {
      try {
        const result = this.detectAnomaliesForChannel(channel.id, startDate, endDate);
        results.push(result);
        totalAnomalies += result.anomalies.length;
        totalExcluded += result.excluded;
        totalChecked += result.checked;

        if (result.anomalies.length > 0) {
          console.log(`[AnomalyDetector] ${channel.channel_handle}: Found ${result.anomalies.length} anomalies (${result.excluded} excluded)`);
        }
      } catch (error) {
        console.error(`[AnomalyDetector] Error processing channel ${channel.channel_handle}:`, error.message);
      }
    });

    console.log(`[AnomalyDetector] Completed: checked ${totalChecked} metrics, found ${totalAnomalies} anomalies, excluded ${totalExcluded}`);

    return {
      channels: results,
      total_anomalies: totalAnomalies,
      total_excluded: totalExcluded,
      total_checked: totalChecked,
      configuration: {
        spike_threshold: this.spikeThreshold,
        lookback_days: this.lookbackDays,
        dry_run: this.dryRun
      }
    };
  }

  getAutoExcludedMetrics() {
    return LiveStreamMetrics.findAutoExcluded();
  }

  restoreAutoExcludedMetrics(channelId = null, startDate = null, endDate = null) {
    const autoExcluded = this.getAutoExcludedMetrics();
    
    let metricsToRestore = autoExcluded;

    if (channelId) {
      metricsToRestore = metricsToRestore.filter(m => m.channel_id === channelId);
    }

    if (startDate && endDate) {
      metricsToRestore = metricsToRestore.filter(m => m.date >= startDate && m.date <= endDate);
    } else if (startDate) {
      metricsToRestore = metricsToRestore.filter(m => m.date >= startDate);
    } else if (endDate) {
      metricsToRestore = metricsToRestore.filter(m => m.date <= endDate);
    }

    let restored = 0;
    metricsToRestore.forEach(metric => {
      try {
        LiveStreamMetrics.restoreById(metric.id);
        restored++;
        console.log(`[AnomalyDetector] Restored: ${metric.channel_handle} on ${metric.date}`);
      } catch (error) {
        console.error(`[AnomalyDetector] Failed to restore metric ${metric.id}:`, error.message);
      }
    });

    return {
      total_restored: restored,
      metrics: metricsToRestore
    };
  }
}

module.exports = AnomalyDetector;
