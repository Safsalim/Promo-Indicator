const { youtube, QUOTA_LIMIT } = require('../config/youtube');

class YouTubeApiError extends Error {
  constructor(message, type, originalError = null) {
    super(message);
    this.name = 'YouTubeApiError';
    this.type = type;
    this.originalError = originalError;
  }
}

class YouTubeApiClient {
  constructor() {
    this.quotaUsed = 0;
    this.lastResetDate = new Date().toDateString();
    this.rateLimitDelay = 100;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  resetQuotaIfNeeded() {
    const currentDate = new Date().toDateString();
    if (currentDate !== this.lastResetDate) {
      this.quotaUsed = 0;
      this.lastResetDate = currentDate;
    }
  }

  checkQuota(cost) {
    this.resetQuotaIfNeeded();
    
    if (this.quotaUsed + cost > QUOTA_LIMIT) {
      throw new YouTubeApiError(
        `Quota limit exceeded. Used: ${this.quotaUsed}, Limit: ${QUOTA_LIMIT}, Requested: ${cost}`,
        'QUOTA_EXCEEDED'
      );
    }
    
    this.quotaUsed += cost;
  }

  async rateLimitedCall(fn, quotaCost) {
    this.checkQuota(quotaCost);
    
    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    
    return await fn();
  }

  async retryableCall(fn, quotaCost, retries = this.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.rateLimitedCall(fn, quotaCost);
      } catch (error) {
        lastError = error;
        
        const errorType = this.categorizeError(error);
        
        if (errorType === 'QUOTA_EXCEEDED' || errorType === 'AUTH_ERROR' || errorType === 'INVALID_REQUEST') {
          throw this.createTypedError(error, errorType);
        }
        
        if (attempt < retries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`Retry attempt ${attempt}/${retries} after ${delay}ms due to: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw this.createTypedError(lastError, 'NETWORK_ERROR');
  }

  categorizeError(error) {
    if (!error.response) {
      return 'NETWORK_ERROR';
    }
    
    const status = error.response.status;
    const errorData = error.response.data?.error;
    
    if (status === 403) {
      if (errorData?.errors?.some(e => e.reason === 'quotaExceeded' || e.reason === 'rateLimitExceeded')) {
        return 'QUOTA_EXCEEDED';
      }
      return 'AUTH_ERROR';
    }
    
    if (status === 401) {
      return 'AUTH_ERROR';
    }
    
    if (status === 400) {
      return 'INVALID_REQUEST';
    }
    
    if (status === 404) {
      return 'NOT_FOUND';
    }
    
    if (status >= 500) {
      return 'SERVER_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  createTypedError(error, type) {
    let message = error.message;
    
    if (error.response?.data?.error?.message) {
      message = error.response.data.error.message;
    }
    
    return new YouTubeApiError(message, type, error);
  }

  validateApiKey() {
    if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY === 'your_youtube_api_key_here') {
      throw new YouTubeApiError(
        'YouTube API key is missing or invalid. Please set YOUTUBE_API_KEY in your .env file.',
        'AUTH_ERROR'
      );
    }
  }

  async resolveChannelHandle(handle) {
    this.validateApiKey();
    
    try {
      const formattedHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      const response = await this.retryableCall(async () => {
        return await youtube.channels.list({
          part: ['snippet', 'id'],
          forHandle: formattedHandle
        });
      }, 1);

      if (!response.data.items || response.data.items.length === 0) {
        const searchResponse = await this.retryableCall(async () => {
          return await youtube.search.list({
            part: ['snippet'],
            q: handle,
            type: ['channel'],
            maxResults: 1
          });
        }, 100);

        if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
          throw new YouTubeApiError(
            `Channel not found for handle: ${handle}`,
            'NOT_FOUND'
          );
        }

        const channelId = searchResponse.data.items[0].snippet.channelId;
        const channelTitle = searchResponse.data.items[0].snippet.title;

        return { channelId, channelTitle };
      }

      return {
        channelId: response.data.items[0].id,
        channelTitle: response.data.items[0].snippet.title
      };
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        throw error;
      }
      throw this.createTypedError(error, this.categorizeError(error));
    }
  }

  async searchLiveStreams(channelId, startDate, endDate, options = {}) {
    this.validateApiKey();
    
    const {
      maxResults = 50,
      eventType = 'completed',
      order = 'date',
      videoDuration = 'medium'
    } = options;

    try {
      const liveStreams = [];
      let pageToken = null;
      let pageCount = 0;
      const maxPages = 10;

      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      do {
        const response = await this.retryableCall(async () => {
          return await youtube.search.list({
            part: ['snippet'],
            channelId: channelId,
            eventType: eventType,
            type: ['video'],
            videoDuration: videoDuration,
            publishedAfter: startDateTime.toISOString(),
            publishedBefore: endDateTime.toISOString(),
            maxResults: maxResults,
            pageToken: pageToken,
            order: order
          });
        }, 100);

        if (response.data.items && response.data.items.length > 0) {
          liveStreams.push(...response.data.items);
        }

        pageToken = response.data.nextPageToken;
        pageCount++;
        
        if (pageCount >= maxPages) {
          console.warn(`Reached maximum page limit (${maxPages}) for channel ${channelId}`);
          break;
        }
      } while (pageToken);

      return liveStreams;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        throw error;
      }
      throw this.createTypedError(error, this.categorizeError(error));
    }
  }

  async getVideoStatistics(videoIds) {
    this.validateApiKey();
    
    if (!videoIds || videoIds.length === 0) {
      return [];
    }

    try {
      const chunkSize = 50;
      const allStats = [];

      for (let i = 0; i < videoIds.length; i += chunkSize) {
        const chunk = videoIds.slice(i, i + chunkSize);
        
        const response = await this.retryableCall(async () => {
          return await youtube.videos.list({
            part: ['statistics', 'snippet', 'liveStreamingDetails'],
            id: chunk
          });
        }, 1);

        if (response.data.items) {
          allStats.push(...response.data.items);
        }
      }

      return allStats;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        throw error;
      }
      throw this.createTypedError(error, this.categorizeError(error));
    }
  }

  async getLiveStreamViewCounts(channelId, date) {
    this.validateApiKey();
    
    try {
      const liveStreams = await this.searchLiveStreams(channelId, date, date);
      
      if (liveStreams.length === 0) {
        return {
          date: date,
          totalViews: 0,
          streamCount: 0,
          streams: []
        };
      }

      const videoIds = liveStreams.map(stream => stream.id.videoId);
      const statistics = await this.getVideoStatistics(videoIds);

      const streams = [];
      let totalViews = 0;

      statistics.forEach(stat => {
        const viewCount = parseInt(stat.statistics.viewCount || 0);
        totalViews += viewCount;
        
        streams.push({
          videoId: stat.id,
          title: stat.snippet.title,
          publishedAt: stat.snippet.publishedAt,
          viewCount: viewCount,
          likeCount: parseInt(stat.statistics.likeCount || 0),
          commentCount: parseInt(stat.statistics.commentCount || 0)
        });
      });

      return {
        date: date,
        totalViews: totalViews,
        streamCount: streams.length,
        streams: streams
      };
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        throw error;
      }
      throw this.createTypedError(error, this.categorizeError(error));
    }
  }

  async getLiveStreamAggregateViews(channelId, startDate, endDate) {
    this.validateApiKey();
    
    try {
      const liveStreams = await this.searchLiveStreams(channelId, startDate, endDate);
      
      if (liveStreams.length === 0) {
        return {};
      }

      const videoIds = liveStreams.map(stream => stream.id.videoId);
      const statistics = await this.getVideoStatistics(videoIds);

      const aggregateByDate = {};

      liveStreams.forEach(stream => {
        const videoId = stream.id.videoId;
        const publishedDate = stream.snippet.publishedAt.split('T')[0];

        const stats = statistics.find(s => s.id === videoId);
        if (!stats) {
          return;
        }

        if (!aggregateByDate[publishedDate]) {
          aggregateByDate[publishedDate] = {
            date: publishedDate,
            totalViews: 0,
            streamCount: 0,
            videoIds: []
          };
        }

        const viewCount = parseInt(stats.statistics.viewCount || 0);
        aggregateByDate[publishedDate].totalViews += viewCount;
        aggregateByDate[publishedDate].streamCount++;
        aggregateByDate[publishedDate].videoIds.push(videoId);
      });

      return aggregateByDate;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        throw error;
      }
      throw this.createTypedError(error, this.categorizeError(error));
    }
  }

  getQuotaUsage() {
    this.resetQuotaIfNeeded();
    return {
      used: this.quotaUsed,
      limit: QUOTA_LIMIT,
      remaining: QUOTA_LIMIT - this.quotaUsed,
      percentage: ((this.quotaUsed / QUOTA_LIMIT) * 100).toFixed(2)
    };
  }

  resetQuota() {
    this.quotaUsed = 0;
    this.lastResetDate = new Date().toDateString();
  }
}

module.exports = {
  YouTubeApiClient,
  YouTubeApiError
};
