const { getDatabase } = require('../config/database');

class LiveStreamMetrics {
  static create(metricsData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO live_stream_metrics (channel_id, date, total_live_stream_views, live_stream_count, peak_video_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      metricsData.channel_id,
      metricsData.date,
      metricsData.total_live_stream_views || 0,
      metricsData.live_stream_count || 0,
      metricsData.peak_video_id || null
    );
  }

  static createOrUpdate(metricsData) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO live_stream_metrics (channel_id, date, total_live_stream_views, live_stream_count, peak_video_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(channel_id, date) 
      DO UPDATE SET 
        total_live_stream_views = excluded.total_live_stream_views,
        live_stream_count = excluded.live_stream_count,
        peak_video_id = excluded.peak_video_id,
        created_at = CURRENT_TIMESTAMP
    `);
    
    return stmt.run(
      metricsData.channel_id,
      metricsData.date,
      metricsData.total_live_stream_views || 0,
      metricsData.live_stream_count || 0,
      metricsData.peak_video_id || null
    );
  }

  static findById(id) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM live_stream_metrics WHERE id = ?');
    return stmt.get(id);
  }

  static findByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM live_stream_metrics 
      WHERE channel_id = ? 
      ORDER BY date DESC
    `);
    return stmt.all(channelId);
  }

  static findByChannelIdAndDate(channelId, date) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM live_stream_metrics 
      WHERE channel_id = ? AND date = ?
    `);
    return stmt.get(channelId, date);
  }

  static findByChannelIdAndDateRange(channelId, startDate, endDate) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM live_stream_metrics 
      WHERE channel_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `);
    return stmt.all(channelId, startDate, endDate);
  }

  static findByDateRange(startDate, endDate) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT lsm.*, c.channel_handle, c.channel_name
      FROM live_stream_metrics lsm
      JOIN channels c ON lsm.channel_id = c.id
      WHERE lsm.date >= ? AND lsm.date <= ?
      ORDER BY lsm.date ASC, c.channel_name ASC
    `);
    return stmt.all(startDate, endDate);
  }

  static findAll() {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT lsm.*, c.channel_handle, c.channel_name
      FROM live_stream_metrics lsm
      JOIN channels c ON lsm.channel_id = c.id
      ORDER BY lsm.date DESC, c.channel_name ASC
    `);
    return stmt.all();
  }

  static findLatestByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM live_stream_metrics 
      WHERE channel_id = ? 
      ORDER BY date DESC 
      LIMIT 1
    `);
    return stmt.get(channelId);
  }

  static update(id, metricsData) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    if (metricsData.total_live_stream_views !== undefined) {
      fields.push('total_live_stream_views = ?');
      values.push(metricsData.total_live_stream_views);
    }
    if (metricsData.live_stream_count !== undefined) {
      fields.push('live_stream_count = ?');
      values.push(metricsData.live_stream_count);
    }
    if (metricsData.peak_video_id !== undefined) {
      fields.push('peak_video_id = ?');
      values.push(metricsData.peak_video_id);
    }
    if (metricsData.date !== undefined) {
      fields.push('date = ?');
      values.push(metricsData.date);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('created_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE live_stream_metrics 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    
    return stmt.run(...values);
  }

  static delete(id) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM live_stream_metrics WHERE id = ?');
    return stmt.run(id);
  }

  static deleteByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM live_stream_metrics WHERE channel_id = ?');
    return stmt.run(channelId);
  }

  static deleteByDate(date) {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM live_stream_metrics WHERE date = ?');
    return stmt.run(date);
  }

  static getTotalViewsByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT SUM(total_live_stream_views) as total_views
      FROM live_stream_metrics 
      WHERE channel_id = ?
    `);
    return stmt.get(channelId).total_views || 0;
  }

  static getAverageViewsByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT AVG(total_live_stream_views) as avg_views
      FROM live_stream_metrics 
      WHERE channel_id = ?
    `);
    return stmt.get(channelId).avg_views || 0;
  }

  static getMetricsSummaryByChannelId(channelId) {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_days,
        SUM(total_live_stream_views) as total_views,
        AVG(total_live_stream_views) as avg_views,
        MAX(total_live_stream_views) as max_views,
        MIN(total_live_stream_views) as min_views,
        SUM(live_stream_count) as total_streams,
        AVG(live_stream_count) as avg_streams
      FROM live_stream_metrics 
      WHERE channel_id = ?
    `);
    return stmt.get(channelId);
  }
}

module.exports = LiveStreamMetrics;
