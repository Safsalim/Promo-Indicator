const express = require('express');
const router = express.Router();
const promoService = require('../services/promoService');
const Video = require('../models/Video');
const VideoStats = require('../models/VideoStats');

router.get('/analyze/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const indicators = promoService.analyzePromoIndicators(videoId);
    res.json(indicators);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/indicators/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const indicators = promoService.getPromoIndicators(videoId);
    res.json(indicators);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/indicators', (req, res) => {
  try {
    const { videoId, indicatorType, indicatorValue, notes } = req.body;
    
    if (!videoId || !indicatorType) {
      return res.status(400).json({ error: 'videoId and indicatorType are required' });
    }
    
    const result = promoService.savePromoIndicator(videoId, indicatorType, indicatorValue, notes);
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/videos', (req, res) => {
  try {
    const videos = Video.findAll();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const stats = VideoStats.findByVideoId(videoId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
