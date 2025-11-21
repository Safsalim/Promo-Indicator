const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const LiveStreamMetrics = require('../models/LiveStreamMetrics');
const LiveStreamVideo = require('../models/LiveStreamVideo');
const { YouTubeApiClient, YouTubeApiError } = require('../services/youtubeApiClient');
const liveStreamCollector = require('../services/liveStreamCollector');
const { calculateRSIWithDates, categorizeRSI, getRSILabel, calculateMA7WithDates, calculateVSI } = require('../utils/indicators');
const AnomalyDetector = require('../services/anomalyDetector');
const anomalyDetectionConfig = require('../config/anomalyDetection');

// GET /api/channels - List all tracked channels with their metadata
router.get('/channels', (req, res) => {
  try {
    const channels = Channel.findAll();
    
    res.json({
      success: true,
      data: channels,
      count: channels.length
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels'
    });
  }
});

// POST /api/channels - Add a new channel to track
router.post('/channels', async (req, res) => {
  try {
    const { channel_handle } = req.body;

    // Input validation
    if (!channel_handle) {
      return res.status(400).json({
        success: false,
        error: 'channel_handle is required'
      });
    }

    if (typeof channel_handle !== 'string' || channel_handle.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'channel_handle must be a non-empty string'
      });
    }

    const trimmedHandle = channel_handle.trim();

    // Check if channel already exists
    const existingChannel = Channel.findByHandle(trimmedHandle);
    if (existingChannel) {
      return res.status(409).json({
        success: false,
        error: 'Channel with this handle already exists',
        data: existingChannel
      });
    }

    // Resolve channel handle using YouTube API
    const youtubeClient = new YouTubeApiClient();
    let channelId, channelName;

    try {
      const result = await youtubeClient.resolveChannelHandle(trimmedHandle);
      channelId = result.channelId;
      channelName = result.channelTitle;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        if (error.type === 'NOT_FOUND') {
          return res.status(404).json({
            success: false,
            error: `Channel not found: ${trimmedHandle}`
          });
        } else if (error.type === 'AUTH_ERROR') {
          return res.status(500).json({
            success: false,
            error: 'YouTube API authentication error'
          });
        } else if (error.type === 'QUOTA_EXCEEDED') {
          return res.status(503).json({
            success: false,
            error: 'YouTube API quota exceeded. Please try again later.'
          });
        }
      }
      throw error;
    }

    // Create the channel
    const result = Channel.create({
      channel_handle: trimmedHandle,
      channel_id: channelId,
      channel_name: channelName,
      is_active: 1
    });

    // Fetch the created channel
    const createdChannel = Channel.findById(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: createdChannel
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create channel'
    });
  }
});

// GET /api/metrics - Query metrics with filters
router.get('/metrics', (req, res) => {
  try {
    const { channel_ids, start_date, end_date, limit, rsi_period } = req.query;

    // Input validation
    let channelIdsArray = null;
    if (channel_ids) {
      try {
        // Handle both array and comma-separated string formats
        if (Array.isArray(channel_ids)) {
          channelIdsArray = channel_ids.map(id => parseInt(id, 10));
        } else if (typeof channel_ids === 'string') {
          channelIdsArray = channel_ids.split(',').map(id => parseInt(id.trim(), 10));
        }

        // Validate all IDs are valid integers
        if (channelIdsArray.some(id => isNaN(id) || id <= 0)) {
          return res.status(400).json({
            success: false,
            error: 'channel_ids must be valid positive integers'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid channel_ids format'
        });
      }
    }

    // Validate dates
    if (start_date && !isValidDate(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'start_date must be in YYYY-MM-DD format'
      });
    }

    if (end_date && !isValidDate(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'end_date must be in YYYY-MM-DD format'
      });
    }

    // Validate limit
    let limitValue = null;
    if (limit) {
      limitValue = parseInt(limit, 10);
      if (isNaN(limitValue) || limitValue <= 0) {
        return res.status(400).json({
          success: false,
          error: 'limit must be a positive integer'
        });
      }
    }

    // Validate RSI period
    let rsiPeriod = 14;
    if (rsi_period) {
      rsiPeriod = parseInt(rsi_period, 10);
      if (isNaN(rsiPeriod) || rsiPeriod <= 0) {
        return res.status(400).json({
          success: false,
          error: 'rsi_period must be a positive integer'
        });
      }
    }

    // Build query based on filters
    const { getDatabase } = require('../config/database');
    const db = getDatabase();

    let query = `
      SELECT lsm.*, c.channel_handle, c.channel_name, c.channel_id as youtube_channel_id
      FROM live_stream_metrics lsm
      JOIN channels c ON lsm.channel_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (channelIdsArray && channelIdsArray.length > 0) {
      query += ` AND lsm.channel_id IN (${channelIdsArray.map(() => '?').join(',')})`;
      params.push(...channelIdsArray);
    }

    if (start_date) {
      query += ` AND lsm.date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND lsm.date <= ?`;
      params.push(end_date);
    }

    query += ` ORDER BY lsm.date ASC, c.channel_name ASC`;

    if (limitValue) {
      query += ` LIMIT ?`;
      params.push(limitValue);
    }

    const stmt = db.prepare(query);
    const metrics = stmt.all(...params);

    // Calculate RSI, MA7, and VSI for each channel
    const rsiByChannel = {};
    const ma7ByChannel = {};
    const vsiByChannel = {};
    if (channelIdsArray && channelIdsArray.length > 0) {
      channelIdsArray.forEach(channelId => {
        const channelMetrics = metrics.filter(m => m.channel_id === channelId);
        if (channelMetrics.length > 0) {
          const rsiData = calculateRSIWithDates(channelMetrics, rsiPeriod);
          rsiByChannel[channelId] = rsiData;

          const ma7Data = calculateMA7WithDates(channelMetrics);
          ma7ByChannel[channelId] = ma7Data;

          const vsiData = calculateVSI(ma7Data);
          vsiByChannel[channelId] = vsiData;
        }
      });
    }

    // Merge MA7 and VSI data into metrics
    const enrichedMetrics = metrics.map(metric => {
      const ma7Data = ma7ByChannel[metric.channel_id];
      if (ma7Data) {
        const ma7Entry = ma7Data.find(entry => entry.date === metric.date);
        if (ma7Entry) {
          metric.views_ma7 = ma7Entry.views_ma7;
        }
      }

      const vsiData = vsiByChannel[metric.channel_id];
      if (vsiData) {
        const vsiEntry = vsiData.find(entry => entry.date === metric.date);
        if (vsiEntry) {
          metric.vsi = vsiEntry.vsi;
        }
      }

      return metric;
    });

    res.json({
      success: true,
      data: enrichedMetrics,
      count: enrichedMetrics.length,
      rsi: rsiByChannel,
      ma7: ma7ByChannel,
      vsi: vsiByChannel,
      filters: {
        channel_ids: channelIdsArray,
        start_date: start_date || null,
        end_date: end_date || null,
        limit: limitValue || null,
        rsi_period: rsiPeriod
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

// GET /api/metrics/summary - Get summary statistics
router.get('/metrics/summary', (req, res) => {
  try {
    const { channel_ids, start_date, end_date } = req.query;

    // Input validation
    let channelIdsArray = null;
    if (channel_ids) {
      try {
        // Handle both array and comma-separated string formats
        if (Array.isArray(channel_ids)) {
          channelIdsArray = channel_ids.map(id => parseInt(id, 10));
        } else if (typeof channel_ids === 'string') {
          channelIdsArray = channel_ids.split(',').map(id => parseInt(id.trim(), 10));
        }

        // Validate all IDs are valid integers
        if (channelIdsArray.some(id => isNaN(id) || id <= 0)) {
          return res.status(400).json({
            success: false,
            error: 'channel_ids must be valid positive integers'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid channel_ids format'
        });
      }
    }

    // Validate dates
    if (start_date && !isValidDate(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'start_date must be in YYYY-MM-DD format'
      });
    }

    if (end_date && !isValidDate(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'end_date must be in YYYY-MM-DD format'
      });
    }

    // Build query for summary statistics
    const { getDatabase } = require('../config/database');
    const db = getDatabase();

    let query = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT lsm.channel_id) as total_channels,
        COUNT(DISTINCT lsm.date) as total_days,
        SUM(lsm.total_live_stream_views) as total_views,
        AVG(lsm.total_live_stream_views) as avg_views,
        MAX(lsm.total_live_stream_views) as max_views,
        MIN(lsm.total_live_stream_views) as min_views,
        SUM(lsm.live_stream_count) as total_streams,
        AVG(lsm.live_stream_count) as avg_streams
      FROM live_stream_metrics lsm
      WHERE 1=1
    `;
    const params = [];

    if (channelIdsArray && channelIdsArray.length > 0) {
      query += ` AND lsm.channel_id IN (${channelIdsArray.map(() => '?').join(',')})`;
      params.push(...channelIdsArray);
    }

    if (start_date) {
      query += ` AND lsm.date >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND lsm.date <= ?`;
      params.push(end_date);
    }

    const stmt = db.prepare(query);
    const summary = stmt.get(...params);

    // Calculate trend if we have date range
    let trend = null;
    if (start_date && end_date) {
      const trendQuery = `
        SELECT 
          date,
          SUM(total_live_stream_views) as daily_views
        FROM live_stream_metrics
        WHERE date >= ? AND date <= ?
        ${channelIdsArray && channelIdsArray.length > 0 ? 
          `AND channel_id IN (${channelIdsArray.map(() => '?').join(',')})` : ''}
        GROUP BY date
        ORDER BY date ASC
      `;
      
      const trendParams = [start_date, end_date];
      if (channelIdsArray && channelIdsArray.length > 0) {
        trendParams.push(...channelIdsArray);
      }

      const trendStmt = db.prepare(trendQuery);
      const trendData = trendStmt.all(...trendParams);

      if (trendData.length > 1) {
        const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
        const secondHalf = trendData.slice(Math.floor(trendData.length / 2));

        const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.daily_views, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.daily_views, 0) / secondHalf.length;

        if (firstHalfAvg > 0) {
          const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
          trend = {
            direction: trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'stable',
            percentage: Math.abs(trendPercentage).toFixed(2),
            first_period_avg: Math.round(firstHalfAvg),
            second_period_avg: Math.round(secondHalfAvg)
          };
        }
      }
    }

    // Get per-channel breakdown if filtering by specific channels
    let channelBreakdown = null;
    if (channelIdsArray && channelIdsArray.length > 0) {
      const breakdownQuery = `
        SELECT 
          c.id,
          c.channel_handle,
          c.channel_name,
          COUNT(*) as record_count,
          SUM(lsm.total_live_stream_views) as total_views,
          AVG(lsm.total_live_stream_views) as avg_views,
          SUM(lsm.live_stream_count) as total_streams
        FROM live_stream_metrics lsm
        JOIN channels c ON lsm.channel_id = c.id
        WHERE lsm.channel_id IN (${channelIdsArray.map(() => '?').join(',')})
        ${start_date ? 'AND lsm.date >= ?' : ''}
        ${end_date ? 'AND lsm.date <= ?' : ''}
        GROUP BY c.id, c.channel_handle, c.channel_name
        ORDER BY total_views DESC
      `;

      const breakdownParams = [...channelIdsArray];
      if (start_date) breakdownParams.push(start_date);
      if (end_date) breakdownParams.push(end_date);

      const breakdownStmt = db.prepare(breakdownQuery);
      channelBreakdown = breakdownStmt.all(...breakdownParams);
    }

    res.json({
      success: true,
      data: {
        summary: {
          total_records: summary.total_records || 0,
          total_channels: summary.total_channels || 0,
          total_days: summary.total_days || 0,
          total_views: summary.total_views || 0,
          avg_views: summary.avg_views ? Math.round(summary.avg_views) : 0,
          max_views: summary.max_views || 0,
          min_views: summary.min_views || 0,
          total_streams: summary.total_streams || 0,
          avg_streams: summary.avg_streams ? parseFloat(summary.avg_streams.toFixed(2)) : 0
        },
        trend: trend,
        channel_breakdown: channelBreakdown
      },
      filters: {
        channel_ids: channelIdsArray,
        start_date: start_date || null,
        end_date: end_date || null
      }
    });
  } catch (error) {
    console.error('Error fetching metrics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics summary'
    });
  }
});

// GET /api/metrics/:date/videos - Get videos counted for a specific date
router.get('/metrics/:date/videos', (req, res) => {
  try {
    const { date } = req.params;
    const { channel_ids } = req.query;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        error: 'date must be in YYYY-MM-DD format'
      });
    }

    let channelIdsArray = null;
    if (channel_ids) {
      try {
        if (Array.isArray(channel_ids)) {
          channelIdsArray = channel_ids.map(id => parseInt(id, 10));
        } else if (typeof channel_ids === 'string') {
          channelIdsArray = channel_ids.split(',').map(id => parseInt(id.trim(), 10));
        }

        if (channelIdsArray.some(id => isNaN(id) || id <= 0)) {
          return res.status(400).json({
            success: false,
            error: 'channel_ids must be valid positive integers'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid channel_ids format'
        });
      }
    }

    const { getDatabase } = require('../config/database');
    const db = getDatabase();

    let query = `
      SELECT lsv.*, c.channel_handle, c.channel_name, c.channel_id as youtube_channel_id
      FROM live_stream_videos lsv
      JOIN channels c ON lsv.channel_id = c.id
      WHERE lsv.date = ?
    `;
    const params = [date];

    if (channelIdsArray && channelIdsArray.length > 0) {
      query += ` AND lsv.channel_id IN (${channelIdsArray.map(() => '?').join(',')})`;
      params.push(...channelIdsArray);
    }

    query += ` ORDER BY c.channel_name ASC, lsv.view_count DESC`;

    const stmt = db.prepare(query);
    const videos = stmt.all(...params);

    const summary = {
      date: date,
      total_videos: videos.length,
      total_views: videos.reduce((sum, v) => sum + (v.view_count || 0), 0),
      channels: [...new Set(videos.map(v => v.channel_id))].length
    };

    const byChannel = {};
    videos.forEach(video => {
      if (!byChannel[video.channel_id]) {
        byChannel[video.channel_id] = {
          channel_id: video.channel_id,
          channel_handle: video.channel_handle,
          channel_name: video.channel_name,
          youtube_channel_id: video.youtube_channel_id,
          videos: [],
          total_views: 0,
          video_count: 0
        };
      }

      byChannel[video.channel_id].videos.push({
        video_id: video.video_id,
        title: video.title,
        url: video.url,
        view_count: video.view_count,
        published_at: video.published_at,
        broadcast_type: video.broadcast_type
      });
      byChannel[video.channel_id].total_views += video.view_count || 0;
      byChannel[video.channel_id].video_count++;
    });

    res.json({
      success: true,
      data: {
        summary: summary,
        videos: videos.map(v => ({
          video_id: v.video_id,
          channel_id: v.channel_id,
          channel_handle: v.channel_handle,
          channel_name: v.channel_name,
          title: v.title,
          url: v.url,
          view_count: v.view_count,
          published_at: v.published_at,
          broadcast_type: v.broadcast_type
        })),
        by_channel: Object.values(byChannel)
      },
      filters: {
        date: date,
        channel_ids: channelIdsArray
      }
    });
  } catch (error) {
    console.error('Error fetching videos for date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos for date'
    });
  }
});

// GET /api/debug/metrics/:channelId/:date - Debug endpoint to inspect raw metrics data
router.get('/debug/metrics/:channelId/:date', (req, res) => {
  try {
    const { channelId, date } = req.params;

    // Validate channel ID
    const channelIdInt = parseInt(channelId, 10);
    if (isNaN(channelIdInt) || channelIdInt <= 0) {
      return res.status(400).json({
        success: false,
        error: 'channelId must be a valid positive integer'
      });
    }

    // Validate date
    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        error: 'date must be in YYYY-MM-DD format'
      });
    }

    // Get channel info
    const channel = Channel.findById(channelIdInt);
    if (!channel) {
      return res.status(404).json({
        success: false,
        error: `Channel with ID ${channelIdInt} not found`
      });
    }

    // Get metrics for this channel/date
    const metrics = LiveStreamMetrics.findByChannelIdAndDate(channelIdInt, date);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: `No metrics found for channel ${channel.channel_handle} on ${date}`,
        data: {
          date: date,
          channel_handle: channel.channel_handle,
          channel_name: channel.channel_name,
          channel_id: channelIdInt,
          total_live_stream_views: 0,
          live_stream_count: 0,
          note: 'No data collected for this date'
        }
      });
    }

    // Get videos for this channel/date to show what was counted
    const videos = LiveStreamVideo.findByChannelIdAndDate(channelIdInt, date);

    res.json({
      success: true,
      data: {
        date: metrics.date,
        channel_handle: channel.channel_handle,
        channel_name: channel.channel_name,
        channel_id: channelIdInt,
        youtube_channel_id: channel.channel_id,
        total_live_stream_views: metrics.total_live_stream_views,
        live_stream_count: metrics.live_stream_count,
        note: metrics.live_stream_count > 1 
          ? 'Multiple videos were aggregated' 
          : metrics.live_stream_count === 1 
            ? 'Single video counted'
            : 'No videos counted',
        videos: videos.map(v => ({
          video_id: v.video_id,
          title: v.title,
          url: v.url,
          view_count: v.view_count,
          published_at: v.published_at,
          broadcast_type: v.broadcast_type
        })),
        raw_metrics_record: {
          id: metrics.id,
          channel_id: metrics.channel_id,
          date: metrics.date,
          total_live_stream_views: metrics.total_live_stream_views,
          live_stream_count: metrics.live_stream_count,
          created_at: metrics.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error fetching debug metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch debug metrics',
      message: error.message
    });
  }
});

// Helper function to validate date format (YYYY-MM-DD)
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return false;
  }

  return dateString === date.toISOString().split('T')[0];
}

// DELETE /api/metrics/date/:date - Delete all metrics and videos for a specific date
router.delete('/metrics/date/:date', (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        error: 'date must be in YYYY-MM-DD format'
      });
    }

    // Delete from both tables
    const metricsResult = LiveStreamMetrics.deleteByDate(date);
    const videosResult = LiveStreamVideo.deleteByDate(date);

    const totalDeleted = metricsResult.changes + videosResult.changes;

    if (totalDeleted === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found for the specified date',
        data: {
          date: date,
          metrics_deleted: 0,
          videos_deleted: 0
        }
      });
    }

    res.json({
      success: true,
      message: `Successfully deleted all data for ${date}`,
      data: {
        date: date,
        metrics_deleted: metricsResult.changes,
        videos_deleted: videosResult.changes,
        total_deleted: totalDeleted
      }
    });
  } catch (error) {
    console.error('Error deleting metrics by date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete metrics',
      message: error.message
    });
  }
});

// Helper function to split date range into 365-day chunks
function splitDateRangeIntoChunks(startDate, endDate, chunkSizeDays = 365) {
  const chunks = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let currentStart = new Date(start);
  
  while (currentStart <= end) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + chunkSizeDays - 1);
    
    // Don't exceed the requested end date
    if (currentEnd > end) {
      currentEnd.setTime(end.getTime());
    }
    
    chunks.push({
      start: currentStart.toISOString().split('T')[0],
      end: currentEnd.toISOString().split('T')[0]
    });
    
    // Move to next chunk
    currentStart.setDate(currentStart.getDate() + chunkSizeDays);
  }
  
  return chunks;
}

// POST /api/collect-metrics - Trigger metrics collection
router.post('/collect-metrics', async (req, res) => {
  try {
    const { start_date, end_date, channel_ids, verbose, include_members_only } = req.body;

    // Input validation
    if (start_date && !isValidDate(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'start_date must be in YYYY-MM-DD format'
      });
    }

    if (end_date && !isValidDate(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'end_date must be in YYYY-MM-DD format'
      });
    }

    let channelIdsArray = null;
    if (channel_ids) {
      try {
        if (Array.isArray(channel_ids)) {
          channelIdsArray = channel_ids.map(id => parseInt(id, 10));
        } else if (typeof channel_ids === 'string') {
          channelIdsArray = channel_ids.split(',').map(id => parseInt(id.trim(), 10));
        }

        if (channelIdsArray && channelIdsArray.some(id => isNaN(id) || id <= 0)) {
          return res.status(400).json({
            success: false,
            error: 'channel_ids must be valid positive integers'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid channel_ids format'
        });
      }
    }

    // Validate date range
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'start_date must be before or equal to end_date'
        });
      }
    }

    // Check if date range exceeds 365 days and split if necessary
    const dateRanges = [];
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        console.log(`Date range exceeds 365 days (${diffDays} days). Splitting into multiple requests...`);
        const chunks = splitDateRangeIntoChunks(start_date, end_date, 365);
        dateRanges.push(...chunks);
        console.log(`Split into ${chunks.length} chunks of 365 days each`);
      } else {
        dateRanges.push({ start: start_date, end: end_date });
      }
    } else {
      // If no date range specified, use defaults from collector
      dateRanges.push({ start: start_date || null, end: end_date || null });
    }

    // Collect metrics for each date range chunk
    const allResults = {
      totalChannels: 0,
      successful: 0,
      failed: 0,
      details: [],
      chunks: dateRanges.length
    };

    for (let i = 0; i < dateRanges.length; i++) {
      const chunk = dateRanges[i];
      console.log(`\nProcessing chunk ${i + 1}/${dateRanges.length}: ${chunk.start} to ${chunk.end}`);
      
      const collectionOptions = {
        startDate: chunk.start,
        endDate: chunk.end,
        channelIds: channelIdsArray,
        dryRun: false,
        verbose: verbose || false,
        includeMembersOnly: include_members_only || false
      };

      const results = await liveStreamCollector.collectMetrics(collectionOptions);

      // Aggregate results from this chunk
      allResults.totalChannels = results.totalChannels;
      allResults.successful += results.successful;
      allResults.failed += results.failed;
      
      // Merge details, combining by channel
      results.details.forEach(detail => {
        const existing = allResults.details.find(d => d.channelId === detail.channelId);
        if (existing) {
          existing.processed = (existing.processed || 0) + (detail.processed || 0);
          existing.success = existing.success && detail.success;
          if (!detail.success) {
            existing.message = detail.message;
          }
        } else {
          allResults.details.push({ ...detail });
        }
      });
    }

    // Recalculate successful/failed based on aggregated details
    allResults.successful = allResults.details.filter(d => d.success).length;
    allResults.failed = allResults.details.filter(d => !d.success).length;

    res.json({
      success: allResults.failed === 0,
      data: {
        total_channels: allResults.totalChannels,
        successful: allResults.successful,
        failed: allResults.failed,
        details: allResults.details,
        chunks_processed: allResults.chunks
      },
      message: allResults.failed === 0 
        ? allResults.chunks > 1 
          ? `Collection completed successfully (processed ${allResults.chunks} date range chunks)` 
          : 'Collection completed successfully'
        : `Collection completed with ${allResults.failed} failure(s)`
    });
  } catch (error) {
    console.error('Error collecting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
});

router.post('/metrics/:id/exclude', (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'manual', metadata = null } = req.body;

    const metric = LiveStreamMetrics.findById(id);
    if (!metric) {
      return res.status(404).json({
        success: false,
        error: 'Metric not found'
      });
    }

    LiveStreamMetrics.excludeById(id, reason, metadata);

    res.json({
      success: true,
      message: 'Metric excluded successfully',
      data: {
        id: parseInt(id),
        reason: reason,
        metadata: metadata
      }
    });
  } catch (error) {
    console.error('Error excluding metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exclude metric'
    });
  }
});

router.post('/metrics/:id/restore', (req, res) => {
  try {
    const { id } = req.params;

    const metric = LiveStreamMetrics.findById(id);
    if (!metric) {
      return res.status(404).json({
        success: false,
        error: 'Metric not found'
      });
    }

    LiveStreamMetrics.restoreById(id);

    res.json({
      success: true,
      message: 'Metric restored successfully',
      data: {
        id: parseInt(id)
      }
    });
  } catch (error) {
    console.error('Error restoring metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore metric'
    });
  }
});

router.get('/metrics/excluded', (req, res) => {
  try {
    const { channel_id, auto_only } = req.query;
    
    let excluded;
    if (auto_only === 'true') {
      excluded = LiveStreamMetrics.findAutoExcluded();
    } else if (channel_id) {
      excluded = LiveStreamMetrics.findExcludedByChannelId(parseInt(channel_id));
    } else {
      excluded = LiveStreamMetrics.findExcluded();
    }

    excluded.forEach(metric => {
      if (metric.exclusion_metadata) {
        try {
          metric.exclusion_metadata = JSON.parse(metric.exclusion_metadata);
        } catch (e) {
        }
      }
    });

    res.json({
      success: true,
      data: excluded,
      count: excluded.length
    });
  } catch (error) {
    console.error('Error fetching excluded metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch excluded metrics'
    });
  }
});

router.post('/anomalies/detect', (req, res) => {
  try {
    const {
      channel_id,
      start_date,
      end_date,
      spike_threshold,
      baseline_days,
      min_baseline_days,
      dry_run = false
    } = req.body;

    const detector = new AnomalyDetector({
      spikeThreshold: spike_threshold || anomalyDetectionConfig.spikeThreshold,
      baselineDays: baseline_days || anomalyDetectionConfig.baselineDays,
      minBaselineDays: min_baseline_days || anomalyDetectionConfig.minBaselineDays,
      dryRun: dry_run
    });

    let result;
    if (channel_id) {
      result = detector.detectAnomaliesForChannel(channel_id, start_date, end_date);
    } else {
      result = detector.detectAnomaliesForAllChannels(start_date, end_date);
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect anomalies',
      message: error.message
    });
  }
});

router.post('/anomalies/restore', (req, res) => {
  try {
    const {
      channel_id,
      start_date,
      end_date
    } = req.body;

    const detector = new AnomalyDetector();
    const result = detector.restoreAutoExcludedMetrics(channel_id, start_date, end_date);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error restoring anomalies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore anomalies',
      message: error.message
    });
  }
});

router.get('/anomalies/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: anomalyDetectionConfig
    });
  } catch (error) {
    console.error('Error fetching anomaly detection config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration'
    });
  }
});

module.exports = router;
