#!/usr/bin/env node

require('dotenv').config();
const { getDatabase, closeDatabase } = require('../config/database');

console.log('Running migration: Rename total_live_stream_views to peak_live_stream_views...');
console.log('This migration updates the aggregation logic from sum to max views.\n');

try {
  const db = getDatabase();

  // Check if the old column exists
  const tableInfo = db.prepare("PRAGMA table_info(live_stream_metrics)").all();
  const hasOldColumn = tableInfo.some(col => col.name === 'total_live_stream_views');
  const hasNewColumn = tableInfo.some(col => col.name === 'peak_live_stream_views');
  const hasPeakVideoId = tableInfo.some(col => col.name === 'peak_video_id');

  if (!hasOldColumn && hasNewColumn && hasPeakVideoId) {
    console.log('✓ Migration already applied. Schema is up to date.');
    closeDatabase();
    process.exit(0);
  }

  if (hasOldColumn) {
    console.log('Found old column: total_live_stream_views');
    console.log('Creating new table with updated schema...');

    // Create a new table with the updated schema
    db.exec(`
      -- Create new table with updated column names
      CREATE TABLE IF NOT EXISTS live_stream_metrics_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        peak_live_stream_views INTEGER DEFAULT 0,
        live_stream_count INTEGER DEFAULT 0,
        peak_video_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES channels(id),
        UNIQUE(channel_id, date)
      );

      -- Copy data from old table to new table
      INSERT INTO live_stream_metrics_new (id, channel_id, date, peak_live_stream_views, live_stream_count, created_at)
      SELECT id, channel_id, date, total_live_stream_views, live_stream_count, created_at
      FROM live_stream_metrics;

      -- Drop old table
      DROP TABLE live_stream_metrics;

      -- Rename new table to original name
      ALTER TABLE live_stream_metrics_new RENAME TO live_stream_metrics;

      -- Recreate indexes
      CREATE INDEX IF NOT EXISTS idx_live_stream_metrics_channel_id ON live_stream_metrics(channel_id);
      CREATE INDEX IF NOT EXISTS idx_live_stream_metrics_date ON live_stream_metrics(date);
    `);

    console.log('✓ Schema updated successfully!');
    console.log('✓ Column renamed: total_live_stream_views → peak_live_stream_views');
    console.log('✓ New column added: peak_video_id');
    console.log('\n⚠️  Note: Existing data has been preserved, but it contains summed values.');
    console.log('   You should re-run data collection to update with peak values:');
    console.log('   node src/scripts/collectLiveStreamMetrics.js --start-date YYYY-MM-DD --end-date YYYY-MM-DD\n');
  } else if (!hasPeakVideoId) {
    console.log('Adding peak_video_id column to existing schema...');
    
    db.exec(`
      ALTER TABLE live_stream_metrics ADD COLUMN peak_video_id TEXT;
    `);

    console.log('✓ Column added: peak_video_id');
  }

  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error running migration:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
