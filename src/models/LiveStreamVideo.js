const { getDatabase } = require('../config/database');

class LiveStreamVideo {
  static create(videoData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO live_stream_videos 
      (video_id, channel_id, date, title, url, view_count, published_at, broadcast_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      videoData.video_id,
      videoData.channel_id,
      videoData.date,
      videoData.title || null,
      videoData.url || null,
      videoData.view_count || 0,
      videoData.published_at || null,
      videoData.broadcast_type || null
    );
  }

  static createOrUpdate(videoData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO live_stream_videos 
      (video_id, channel_id, date, title, url, view_count, published_at, broadcast_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(video_id, channel_id, date) 
      DO UPDATE SET 
        title = excluded.title,
        url = excluded.url,
        view_count = excluded.view_count,
        published_at = excluded.published_at,
        broadcast_type = excluded.broadcast_type,
        created_at = CURRENT_TIMESTAMP
    `);
    
    return stmt.run(
      videoData.video_id,
      videoData.channel_id,
      videoData.date,
      videoData.title || null,
      videoData.url || null,
      videoData.view_count || 0,
      videoData.published_at || null,
      videoData.broadcast_type || null
    );
  }

  static findByChannelIdAndDate(channelId, date) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM live_stream_videos 
      WHERE channel_id = ? AND date = ?
      ORDER BY view_count DESC
    `);
    return stmt.all(channelId, date);
  }

  static findByChannelIdAndDateRange(channelId, startDate, endDate) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM live_stream_videos 
      WHERE channel_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC, view_count DESC
    `);
    return stmt.all(channelId, startDate, endDate);
  }

  static findByVideoId(videoId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT lsv.*, c.channel_handle, c.channel_name
      FROM live_stream_videos lsv
      JOIN channels c ON lsv.channel_id = c.id
      WHERE lsv.video_id = ?
      ORDER BY lsv.date DESC
    `);
    return stmt.all(videoId);
  }

  static deleteByChannelIdAndDate(channelId, date) {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM live_stream_videos 
      WHERE channel_id = ? AND date = ?
    `);
    return stmt.run(channelId, date);
  }

  static deleteByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM live_stream_videos WHERE channel_id = ?');
    return stmt.run(channelId);
  }

  static deleteByDate(date) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM live_stream_videos WHERE date = ?');
    return stmt.run(date);
  }
}

module.exports = LiveStreamVideo;
