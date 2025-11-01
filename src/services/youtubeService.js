const { youtube } = require('../config/youtube');
const { YouTubeApiClient, YouTubeApiError } = require('./youtubeApiClient');

class YouTubeService {
  constructor() {
    this.apiClient = new YouTubeApiClient();
  }

  async getVideoDetails(videoId) {
    try {
      this.apiClient.validateApiKey();
      
      const response = await this.apiClient.retryableCall(async () => {
        return await youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: [videoId]
        });
      }, 1);

      if (!response.data.items || response.data.items.length === 0) {
        throw new YouTubeApiError('Video not found', 'NOT_FOUND');
      }

      return response.data.items[0];
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        console.error(`Error fetching video details: [${error.type}] ${error.message}`);
      } else {
        console.error('Error fetching video details:', error.message);
      }
      throw error;
    }
  }

  async getChannelVideos(channelId, maxResults = 10) {
    try {
      this.apiClient.validateApiKey();
      
      const response = await this.apiClient.retryableCall(async () => {
        return await youtube.search.list({
          part: ['snippet'],
          channelId: channelId,
          maxResults: maxResults,
          order: 'date',
          type: ['video']
        });
      }, 100);

      return response.data.items;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        console.error(`Error fetching channel videos: [${error.type}] ${error.message}`);
      } else {
        console.error('Error fetching channel videos:', error.message);
      }
      throw error;
    }
  }

  async getChannelDetails(channelId) {
    try {
      this.apiClient.validateApiKey();
      
      const response = await this.apiClient.retryableCall(async () => {
        return await youtube.channels.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: [channelId]
        });
      }, 1);

      if (!response.data.items || response.data.items.length === 0) {
        throw new YouTubeApiError('Channel not found', 'NOT_FOUND');
      }

      return response.data.items[0];
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        console.error(`Error fetching channel details: [${error.type}] ${error.message}`);
      } else {
        console.error('Error fetching channel details:', error.message);
      }
      throw error;
    }
  }

  async searchVideos(query, maxResults = 10) {
    try {
      this.apiClient.validateApiKey();
      
      const response = await this.apiClient.retryableCall(async () => {
        return await youtube.search.list({
          part: ['snippet'],
          q: query,
          maxResults: maxResults,
          type: ['video']
        });
      }, 100);

      return response.data.items;
    } catch (error) {
      if (error instanceof YouTubeApiError) {
        console.error(`Error searching videos: [${error.type}] ${error.message}`);
      } else {
        console.error('Error searching videos:', error.message);
      }
      throw error;
    }
  }

  getQuotaUsage() {
    return this.apiClient.getQuotaUsage();
  }
}

module.exports = new YouTubeService();
