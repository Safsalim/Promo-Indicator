const { getDatabase } = require('../config/database');

class FilteredVideo {
  static createOrUpdate(data) {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      INSERT INTO filtered_videos (video_id, channel_id, reason, title, privacy_status, detected_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(video_id, channel_id, detected_at) 
      DO UPDATE SET 
        reason = excluded.reason,
        title = excluded.title,
        privacy_status = excluded.privacy_status
    `);
    
    try {
      stmt.run(
        data.video_id,
        data.channel_id,
        data.reason,
        data.title,
        data.privacy_status || null
      );
      return true;
    } catch (error) {
      console.error('Error creating/updating filtered video:', error);
      throw error;
    }
  }

  static findByChannelIdAndDate(channelId, date) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM filtered_videos 
      WHERE channel_id = ? 
      AND DATE(detected_at) = ?
      ORDER BY detected_at DESC
    `);
    return stmt.all(channelId, date);
  }

  static findByReason(reason, limit = 100) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM filtered_videos 
      WHERE reason = ?
      ORDER BY detected_at DESC
      LIMIT ?
    `);
    return stmt.all(reason, limit);
  }

  static deleteByChannelIdAndDate(channelId, date) {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM filtered_videos 
      WHERE channel_id = ? 
      AND DATE(detected_at) = ?
    `);
    return stmt.run(channelId, date);
  }

  static getStatsByReason(startDate = null, endDate = null) {
    const db = getDatabase();
    let query = `
      SELECT reason, COUNT(*) as count 
      FROM filtered_videos
    `;
    const params = [];

    if (startDate && endDate) {
      query += ` WHERE DATE(detected_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ` WHERE DATE(detected_at) >= ?`;
      params.push(startDate);
    }

    query += ` GROUP BY reason ORDER BY count DESC`;

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }
}

module.exports = FilteredVideo;
