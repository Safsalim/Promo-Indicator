const { getDatabase } = require('../config/database');
const VideoStats = require('../models/VideoStats');

class PromoService {
  analyzePromoIndicators(videoId) {
    const stats = VideoStats.findByVideoId(videoId);
    
    if (stats.length < 2) {
      return { message: 'Insufficient data for analysis' };
    }

    const indicators = [];
    
    for (let i = 0; i < stats.length - 1; i++) {
      const current = stats[i];
      const previous = stats[i + 1];
      
      const viewGrowthRate = ((current.view_count - previous.view_count) / previous.view_count) * 100;
      const likeGrowthRate = ((current.like_count - previous.like_count) / previous.like_count) * 100;
      
      if (viewGrowthRate > 50) {
        indicators.push({
          type: 'high_view_growth',
          value: viewGrowthRate,
          timestamp: current.recorded_at
        });
      }
      
      if (likeGrowthRate > 50) {
        indicators.push({
          type: 'high_engagement_growth',
          value: likeGrowthRate,
          timestamp: current.recorded_at
        });
      }
    }
    
    return indicators;
  }

  savePromoIndicator(videoId, indicatorType, indicatorValue, notes = null) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO promo_indicators (video_id, indicator_type, indicator_value, notes)
      VALUES (?, ?, ?, ?)
    `);
    
    return stmt.run(videoId, indicatorType, indicatorValue, notes);
  }

  getPromoIndicators(videoId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM promo_indicators 
      WHERE video_id = ? 
      ORDER BY detected_at DESC
    `);
    return stmt.all(videoId);
  }
}

module.exports = new PromoService();
