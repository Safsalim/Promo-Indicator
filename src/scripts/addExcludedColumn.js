#!/usr/bin/env node

require('dotenv').config();
const { getDatabase, closeDatabase } = require('../config/database');

console.log('Running migration: Add is_excluded column to live_stream_metrics...');
console.log('This migration adds the ability to exclude anomalous data days.\n');

try {
  const db = getDatabase();

  // Check if the column already exists
  const tableInfo = db.prepare("PRAGMA table_info(live_stream_metrics)").all();
  const hasExcludedColumn = tableInfo.some(col => col.name === 'is_excluded');

  if (hasExcludedColumn) {
    console.log('✓ Migration already applied. is_excluded column exists.');
    closeDatabase();
    process.exit(0);
  }

  console.log('Adding is_excluded column to live_stream_metrics table...');
  
  db.exec(`
    ALTER TABLE live_stream_metrics ADD COLUMN is_excluded INTEGER DEFAULT 0;
  `);

  console.log('✓ Column added: is_excluded (INTEGER DEFAULT 0)');
  console.log('\n📋 Migration completed successfully!');
  console.log('   - is_excluded = 0: Day is included in calculations (default)');
  console.log('   - is_excluded = 1: Day is excluded from calculations');
} catch (error) {
  console.error('Error running migration:', error);
  process.exit(1);
} finally {
  closeDatabase();
}