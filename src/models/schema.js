const { getDatabase } = require('../config/database');

function initializeSchema() {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      published_at DATETIME NOT NULL,
      thumbnail_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS video_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT NOT NULL,
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (video_id) REFERENCES videos(id)
    );

    CREATE TABLE IF NOT EXISTS promo_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT NOT NULL,
      indicator_type TEXT NOT NULL,
      indicator_value REAL,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (video_id) REFERENCES videos(id)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_handle TEXT UNIQUE NOT NULL,
      channel_id TEXT,
      channel_name TEXT,
      added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS live_stream_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      total_live_stream_views INTEGER DEFAULT 0,
      live_stream_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      UNIQUE(channel_id, date)
    );

    CREATE TABLE IF NOT EXISTS live_stream_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT NOT NULL,
      channel_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      title TEXT,
      url TEXT,
      view_count INTEGER DEFAULT 0,
      published_at DATETIME,
      broadcast_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      UNIQUE(video_id, channel_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_video_stats_video_id ON video_stats(video_id);
    CREATE INDEX IF NOT EXISTS idx_video_stats_recorded_at ON video_stats(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_promo_indicators_video_id ON promo_indicators(video_id);
    CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
    CREATE INDEX IF NOT EXISTS idx_live_stream_metrics_channel_id ON live_stream_metrics(channel_id);
    CREATE INDEX IF NOT EXISTS idx_live_stream_metrics_date ON live_stream_metrics(date);
    CREATE INDEX IF NOT EXISTS idx_channels_channel_handle ON channels(channel_handle);
    CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);
    CREATE INDEX IF NOT EXISTS idx_live_stream_videos_channel_date ON live_stream_videos(channel_id, date);
    CREATE INDEX IF NOT EXISTS idx_live_stream_videos_video_id ON live_stream_videos(video_id);
  `);

  console.log('Database schema initialized successfully');
}

module.exports = {
  initializeSchema
};
