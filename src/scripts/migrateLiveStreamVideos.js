require('dotenv').config();
const { getDatabase, closeDatabase } = require('../config/database');

console.log('Running migration: Adding live_stream_videos table...');

try {
  const db = getDatabase();

  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_live_stream_videos_channel_date ON live_stream_videos(channel_id, date);
    CREATE INDEX IF NOT EXISTS idx_live_stream_videos_video_id ON live_stream_videos(video_id);
  `);

  console.log('Migration completed successfully!');
  console.log('Table created:');
  console.log('  - live_stream_videos (with indexes on channel_id+date and video_id)');
  console.log('');
  console.log('This table tracks individual videos that contribute to metrics aggregation.');
  console.log('It enables:');
  console.log('  - Video-level audit trail');
  console.log('  - Duplicate detection and prevention');
  console.log('  - API endpoint: GET /api/metrics/:date/videos');
} catch (error) {
  console.error('Error running migration:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
