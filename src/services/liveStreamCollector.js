const { YouTubeApiClient, YouTubeApiError } = require('./youtubeApiClient');
const Channel = require('../models/Channel');
const LiveStreamMetrics = require('../models/LiveStreamMetrics');

class LiveStreamCollector {
  constructor() {
    this.logger = console;
    this.youtubeClient = new YouTubeApiClient();
  }

  async getChannelIdByHandle(handle) {
    try {
      const result = await this.youtubeClient.resolveChannelHandle(handle);
      return result;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        this.logger.error(`Error resolving channel handle ${handle}: [${error.type}] ${error.message}`);
      } else {
        this.logger.error(`Error resolving channel handle ${handle}:`, error.message);
      }
      throw error;
    }
  }

  async getLiveStreamsForDateRange(channelId, startDate, endDate) {
    try {
      const liveStreams = await this.youtubeClient.searchLiveStreams(channelId, startDate, endDate);
      return liveStreams;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        this.logger.error(`Error fetching live streams for channel ${channelId}: [${error.type}] ${error.message}`);
      } else {
        this.logger.error(`Error fetching live streams for channel ${channelId}:`, error.message);
      }
      throw error;
    }
  }

  async getVideoStatistics(videoIds) {
    try {
      const statistics = await this.youtubeClient.getVideoStatistics(videoIds);
      return statistics;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        this.logger.error(`Error fetching video statistics: [${error.type}] ${error.message}`);
      } else {
        this.logger.error('Error fetching video statistics:', error.message);
      }
      throw error;
    }
  }

  groupStreamsByDate(streams, statistics) {
    const streamsByDate = {};

    streams.forEach(stream => {
      const videoId = stream.id.videoId;
      const publishedDate = stream.snippet.publishedAt.split('T')[0];

      const stats = statistics.find(s => s.id === videoId);
      if (!stats) {
        return;
      }

      const isLiveStream = stats.snippet.liveBroadcastContent === 'none' && 
                          (stats.liveStreamingDetails || 
                           stream.snippet.liveBroadcastContent === 'none');

      if (!streamsByDate[publishedDate]) {
        streamsByDate[publishedDate] = {
          count: 0,
          totalViews: 0,
          videoIds: []
        };
      }

      const viewCount = parseInt(stats.statistics.viewCount || 0);
      streamsByDate[publishedDate].count++;
      streamsByDate[publishedDate].totalViews += viewCount;
      streamsByDate[publishedDate].videoIds.push(videoId);
    });

    return streamsByDate;
  }

  async collectMetricsForChannel(channelDbId, channelId, startDate, endDate, dryRun = false) {
    try {
      this.logger.log(`\nProcessing channel ID ${channelDbId} (${channelId})...`);
      this.logger.log(`Date range: ${startDate} to ${endDate}`);

      const liveStreams = await this.getLiveStreamsForDateRange(channelId, startDate, endDate);
      
      if (liveStreams.length === 0) {
        this.logger.log(`No live streams found for this channel in the date range.`);
        return { success: true, message: 'No live streams found', processed: 0 };
      }

      this.logger.log(`Found ${liveStreams.length} potential live stream(s).`);

      const videoIds = liveStreams.map(stream => stream.id.videoId);
      const statistics = await this.getVideoStatistics(videoIds);

      const streamsByDate = this.groupStreamsByDate(liveStreams, statistics);
      const dates = Object.keys(streamsByDate).sort();

      if (dates.length === 0) {
        this.logger.log(`No valid live stream data to process.`);
        return { success: true, message: 'No valid data', processed: 0 };
      }

      this.logger.log(`Processing ${dates.length} date(s) with live stream data.`);

      let processedCount = 0;
      for (const date of dates) {
        const data = streamsByDate[date];
        
        if (dryRun) {
          this.logger.log(`[DRY RUN] Would store: Date=${date}, Views=${data.totalViews}, Count=${data.count}`);
        } else {
          try {
            LiveStreamMetrics.createOrUpdate({
              channel_id: channelDbId,
              date: date,
              total_live_stream_views: data.totalViews,
              live_stream_count: data.count
            });
            this.logger.log(`✓ Stored: Date=${date}, Views=${data.totalViews}, Count=${data.count}`);
            processedCount++;
          } catch (error) {
            this.logger.error(`✗ Failed to store metrics for date ${date}:`, error.message);
          }
        }
      }

      return { 
        success: true, 
        message: 'Collection completed', 
        processed: processedCount,
        totalDates: dates.length
      };
    } catch (error) {
      let errorMessage = error.message;
      let errorType = 'UNKNOWN';
      
      if (error instanceof YouTubeApiError) {
        errorType = error.type;
        errorMessage = `[${error.type}] ${error.message}`;
        
        if (error.type === 'QUOTA_EXCEEDED') {
          this.logger.error(`\n⚠️  API quota limit reached. Collection stopped for channel ${channelDbId}.`);
        } else if (error.type === 'AUTH_ERROR') {
          this.logger.error(`\n⚠️  Authentication error. Check your API key configuration.`);
        }
      }
      
      this.logger.error(`Error collecting metrics for channel ${channelDbId}: ${errorMessage}`);
      return { 
        success: false, 
        message: errorMessage,
        errorType: errorType,
        processed: 0 
      };
    }
  }

  async collectMetrics(options = {}) {
    const {
      channelIds = null,
      startDate = null,
      endDate = null,
      dryRun = false
    } = options;

    const start = startDate || this.getPreviousDay();
    const end = endDate || start;

    this.logger.log('='.repeat(60));
    this.logger.log('Live Stream Metrics Collection');
    this.logger.log('='.repeat(60));
    this.logger.log(`Date range: ${start} to ${end}`);
    if (dryRun) {
      this.logger.log('*** DRY RUN MODE - No data will be saved ***');
    }
    this.logger.log('='.repeat(60));

    let channels;
    if (channelIds && channelIds.length > 0) {
      channels = channelIds.map(id => Channel.findById(id)).filter(c => c !== undefined);
      this.logger.log(`Processing ${channels.length} specific channel(s)...`);
    } else {
      channels = Channel.findActive();
      this.logger.log(`Processing ${channels.length} active channel(s)...`);
    }

    if (channels.length === 0) {
      this.logger.log('No channels to process.');
      return { totalChannels: 0, successful: 0, failed: 0 };
    }

    const results = {
      totalChannels: channels.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const channel of channels) {
      try {
        const result = await this.collectMetricsForChannel(
          channel.id,
          channel.channel_id,
          start,
          end,
          dryRun
        );

        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
        }

        results.details.push({
          channelId: channel.id,
          channelHandle: channel.channel_handle,
          channelName: channel.channel_name,
          ...result
        });
      } catch (error) {
        this.logger.error(`Failed to process channel ${channel.id}:`, error.message);
        results.failed++;
        results.details.push({
          channelId: channel.id,
          channelHandle: channel.channel_handle,
          channelName: channel.channel_name,
          success: false,
          message: error.message,
          processed: 0
        });
      }
    }

    this.logger.log('\n' + '='.repeat(60));
    this.logger.log('Collection Summary');
    this.logger.log('='.repeat(60));
    this.logger.log(`Total channels: ${results.totalChannels}`);
    this.logger.log(`Successful: ${results.successful}`);
    this.logger.log(`Failed: ${results.failed}`);
    
    const quotaUsage = this.getQuotaUsage();
    this.logger.log('\nAPI Quota Usage:');
    this.logger.log(`Used: ${quotaUsage.used} / ${quotaUsage.limit} (${quotaUsage.percentage}%)`);
    this.logger.log(`Remaining: ${quotaUsage.remaining}`);
    
    this.logger.log('='.repeat(60));

    return results;
  }

  getPreviousDay() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  getQuotaUsage() {
    return this.youtubeClient.getQuotaUsage();
  }

  setLogger(logger) {
    this.logger = logger;
  }
}

module.exports = new LiveStreamCollector();
