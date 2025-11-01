const { getDatabase } = require('../config/database');

class VideoStats {
  static create(statsData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO video_stats (video_id, view_count, like_count, comment_count)
      VALUES (?, ?, ?, ?)
    `);
    
    return stmt.run(
      statsData.video_id,
      statsData.view_count,
      statsData.like_count,
      statsData.comment_count
    );
  }

  static findByVideoId(videoId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM video_stats 
      WHERE video_id = ? 
      ORDER BY recorded_at DESC
    `);
    return stmt.all(videoId);
  }

  static getLatestStats(videoId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM video_stats 
      WHERE video_id = ? 
      ORDER BY recorded_at DESC 
      LIMIT 1
    `);
    return stmt.get(videoId);
  }
}

module.exports = VideoStats;
