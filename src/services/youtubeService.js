const { youtube } = require('../config/youtube');

class YouTubeService {
  async getVideoDetails(videoId) {
    try {
      const response = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      return response.data.items[0];
    } catch (error) {
      console.error('Error fetching video details:', error.message);
      throw error;
    }
  }

  async getChannelVideos(channelId, maxResults = 10) {
    try {
      const response = await youtube.search.list({
        part: ['snippet'],
        channelId: channelId,
        maxResults: maxResults,
        order: 'date',
        type: ['video']
      });

      return response.data.items;
    } catch (error) {
      console.error('Error fetching channel videos:', error.message);
      throw error;
    }
  }

  async getChannelDetails(channelId) {
    try {
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [channelId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      return response.data.items[0];
    } catch (error) {
      console.error('Error fetching channel details:', error.message);
      throw error;
    }
  }

  async searchVideos(query, maxResults = 10) {
    try {
      const response = await youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults: maxResults,
        type: ['video']
      });

      return response.data.items;
    } catch (error) {
      console.error('Error searching videos:', error.message);
      throw error;
    }
  }
}

module.exports = new YouTubeService();
