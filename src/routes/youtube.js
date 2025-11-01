const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtubeService');

router.get('/video/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const videoDetails = await youtubeService.getVideoDetails(videoId);
    res.json(videoDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/channel/:channelId/videos', async (req, res) => {
  try {
    const { channelId } = req.params;
    const maxResults = parseInt(req.query.maxResults) || 10;
    const videos = await youtubeService.getChannelVideos(channelId, maxResults);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const channelDetails = await youtubeService.getChannelDetails(channelId);
    res.json(channelDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, maxResults } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const results = await youtubeService.searchVideos(q, parseInt(maxResults) || 10);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
