require('dotenv').config();
const { getDatabase, closeDatabase } = require('../config/database');

console.log('Running migration: Adding channels and live_stream_metrics tables...');

try {
  const db = getDatabase();

  db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_live_stream_metrics_channel_id ON live_stream_metrics(channel_id);
    CREATE INDEX IF NOT EXISTS idx_live_stream_metrics_date ON live_stream_metrics(date);
    CREATE INDEX IF NOT EXISTS idx_channels_channel_handle ON channels(channel_handle);
    CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);
  `);

  console.log('Migration completed successfully!');
  console.log('Tables created:');
  console.log('  - channels (with indexes on channel_handle and is_active)');
  console.log('  - live_stream_metrics (with indexes on channel_id and date)');
} catch (error) {
  console.error('Error running migration:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
