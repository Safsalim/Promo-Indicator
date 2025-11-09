const LiveStreamMetrics = require('../models/LiveStreamMetrics');
const Channel = require('../models/Channel');
const { calculateMA7WithDates, calculateVSI, getVSILabel, getVSIColor } = require('../utils/indicators');

class VsiCalculator {
  static getVsiForDate(date, channelIds = null) {
    try {
      const targetDate = new Date(date);
      const thirtyDaysAgo = new Date(targetDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = date;

      let metrics;
      if (channelIds && channelIds.length > 0) {
        metrics = [];
        channelIds.forEach(channelId => {
          const channelMetrics = LiveStreamMetrics.findByChannelIdAndDateRange(channelId, startDate, endDate);
          metrics.push(...channelMetrics);
        });
      } else {
        metrics = LiveStreamMetrics.findByDateRange(startDate, endDate);
      }

      if (metrics.length === 0) {
        return null;
      }

      const metricsForCalculation = metrics.filter(m => !m.is_excluded || m.is_excluded === 0);

      const metricsByChannel = {};
      metricsForCalculation.forEach(metric => {
        if (!metricsByChannel[metric.channel_id]) {
          metricsByChannel[metric.channel_id] = [];
        }
        metricsByChannel[metric.channel_id].push(metric);
      });

      const allVsiData = [];
      Object.keys(metricsByChannel).forEach(channelId => {
        const channelMetrics = metricsByChannel[channelId];
        const ma7Data = calculateMA7WithDates(channelMetrics);
        const vsiData = calculateVSI(ma7Data);
        allVsiData.push(...vsiData);
      });

      const targetDateVsi = allVsiData.filter(v => v.date === date);
      
      if (targetDateVsi.length === 0) {
        return null;
      }

      const validVsiValues = targetDateVsi
        .map(v => v.vsi)
        .filter(vsi => vsi !== null && vsi !== undefined);

      if (validVsiValues.length === 0) {
        return null;
      }

      const avgVsi = validVsiValues.reduce((sum, vsi) => sum + vsi, 0) / validVsiValues.length;

      const targetMetrics = metrics.filter(m => m.date === date && (!m.is_excluded || m.is_excluded === 0));
      const totalPeakViews = Math.max(...targetMetrics.map(m => m.total_live_stream_views || 0));
      
      return {
        date: date,
        vsi: Math.round(avgVsi * 100) / 100,
        vsi_label: getVSILabel(avgVsi),
        vsi_color: getVSIColor(avgVsi),
        peak_views: totalPeakViews,
        channels_count: targetMetrics.length,
        all_vsi_data: allVsiData
      };
    } catch (error) {
      console.error('Error calculating VSI for date:', date, error);
      throw error;
    }
  }

  static getVsiTrend(currentDate) {
    try {
      const current = this.getVsiForDate(currentDate);
      if (!current) {
        return null;
      }

      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = previousDate.toISOString().split('T')[0];
      
      const previous = this.getVsiForDate(previousDateStr);
      if (!previous) {
        return {
          current: current,
          previous: null,
          trend: null
        };
      }

      const difference = current.vsi - previous.vsi;
      const percentChange = previous.vsi !== 0 
        ? (difference / previous.vsi) * 100 
        : 0;

      let emoji = '➡️';
      let direction = 'stable';
      
      if (percentChange > 0.5) {
        emoji = '📈';
        direction = 'up';
      } else if (percentChange < -0.5) {
        emoji = '📉';
        direction = 'down';
      }

      return {
        current: current,
        previous: previous,
        trend: {
          emoji: emoji,
          direction: direction,
          difference: Math.round(difference * 100) / 100,
          percent_change: Math.round(percentChange * 100) / 100
        }
      };
    } catch (error) {
      console.error('Error calculating VSI trend:', error);
      throw error;
    }
  }

  static getVsiHistory(date, days = 30) {
    try {
      const endDate = new Date(date);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);

      const dateArray = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateArray.push(new Date(d).toISOString().split('T')[0]);
      }

      const history = [];
      dateArray.forEach(dateStr => {
        const vsiData = this.getVsiForDate(dateStr);
        if (vsiData) {
          history.push({
            date: dateStr,
            vsi: vsiData.vsi,
            peak_views: vsiData.peak_views
          });
        }
      });

      return history;
    } catch (error) {
      console.error('Error getting VSI history:', error);
      throw error;
    }
  }
}

module.exports = VsiCalculator;
