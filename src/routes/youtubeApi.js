const express = require('express');
const router = express.Router();
const { YouTubeApiClient, YouTubeApiError } = require('../services/youtubeApiClient');

const apiClient = new YouTubeApiClient();

router.get('/resolve-channel/:handle', async (req, res) => {
  try {
    const handle = req.params.handle;
    const result = await apiClient.resolveChannelHandle(handle);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/channel/:channelId/livestreams', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { startDate, endDate, eventType, maxResults } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required'
      });
    }
    
    const liveStreams = await apiClient.searchLiveStreams(
      channelId,
      startDate,
      endDate,
      {
        eventType: eventType || 'completed',
        maxResults: parseInt(maxResults) || 50
      }
    );
    
    res.json({
      success: true,
      data: {
        count: liveStreams.length,
        streams: liveStreams
      }
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/channel/:channelId/livestream-views', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'date query parameter is required (YYYY-MM-DD)'
      });
    }
    
    const viewData = await apiClient.getLiveStreamViewCounts(channelId, date);
    
    res.json({
      success: true,
      data: viewData
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/channel/:channelId/livestream-aggregate', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query parameters are required'
      });
    }
    
    const aggregateData = await apiClient.getLiveStreamAggregateViews(
      channelId,
      startDate,
      endDate
    );
    
    const dates = Object.keys(aggregateData).sort();
    const summary = {
      totalDates: dates.length,
      totalStreams: dates.reduce((sum, date) => sum + aggregateData[date].streamCount, 0),
      totalViews: dates.reduce((sum, date) => sum + aggregateData[date].totalViews, 0),
      byDate: aggregateData
    };
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.post('/videos/statistics', async (req, res) => {
  try {
    const { videoIds } = req.body;
    
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'videoIds must be a non-empty array'
      });
    }
    
    const statistics = await apiClient.getVideoStatistics(videoIds);
    
    res.json({
      success: true,
      data: {
        count: statistics.length,
        videos: statistics
      }
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

router.get('/quota', (req, res) => {
  try {
    const quotaUsage = apiClient.getQuotaUsage();
    
    res.json({
      success: true,
      data: quotaUsage
    });
  } catch (error) {
    handleApiError(error, res);
  }
});

function handleApiError(error, res) {
  if (error instanceof YouTubeApiError) {
    const statusCodes = {
      'AUTH_ERROR': 401,
      'QUOTA_EXCEEDED': 429,
      'NOT_FOUND': 404,
      'INVALID_REQUEST': 400,
      'NETWORK_ERROR': 503,
      'SERVER_ERROR': 502
    };
    
    const statusCode = statusCodes[error.type] || 500;
    
    res.status(statusCode).json({
      success: false,
      error: {
        type: error.type,
        message: error.message
      }
    });
  } else {
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
}

module.exports = router;
