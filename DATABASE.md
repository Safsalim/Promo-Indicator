# Database Documentation

This document describes the SQLite database schema for the Promo-Indicator application.

## Overview

The application uses SQLite with the `better-sqlite3` driver for high-performance, synchronous database operations. The database stores YouTube channel configurations and daily live stream metrics.

## Database Location

By default, the database is stored at:
```
./database/promo-indicator.db
```

You can configure a different location via the `DATABASE_PATH` environment variable in your `.env` file.

## Schema

### Tables

#### channels

Stores YouTube channel configurations for tracking.

| Column         | Type    | Constraints                    | Description                          |
|----------------|---------|--------------------------------|--------------------------------------|
| id             | INTEGER | PRIMARY KEY AUTOINCREMENT      | Unique channel identifier            |
| channel_handle | TEXT    | UNIQUE NOT NULL                | YouTube handle (e.g., "@ciidb")      |
| channel_id     | TEXT    |                                | YouTube channel ID from API          |
| channel_name   | TEXT    |                                | Channel display name                 |
| added_date     | DATETIME| DEFAULT CURRENT_TIMESTAMP      | When channel was added to tracking   |
| is_active      | INTEGER | DEFAULT 1                      | Whether channel tracking is enabled  |

**Indexes:**
- `idx_channels_channel_handle` on `channel_handle`
- `idx_channels_is_active` on `is_active`

#### live_stream_metrics

Stores daily metrics for live streams per channel.

| Column                   | Type    | Constraints                    | Description                          |
|--------------------------|---------|--------------------------------|--------------------------------------|
| id                       | INTEGER | PRIMARY KEY AUTOINCREMENT      | Unique metric identifier             |
| channel_id               | INTEGER | FOREIGN KEY → channels(id)     | Reference to channel                 |
| date                     | TEXT    | NOT NULL                       | Date of metrics (YYYY-MM-DD)         |
| total_live_stream_views  | INTEGER | DEFAULT 0                      | Total views for all streams that day |
| live_stream_count        | INTEGER | DEFAULT 0                      | Number of live streams detected      |
| created_at               | DATETIME| DEFAULT CURRENT_TIMESTAMP      | When record was created/updated      |

**Constraints:**
- UNIQUE constraint on `(channel_id, date)` - ensures one record per channel per day

**Indexes:**
- `idx_live_stream_metrics_channel_id` on `channel_id`
- `idx_live_stream_metrics_date` on `date`

### Existing Tables (for reference)

The database also includes the following tables from the original schema:

- **videos**: Stores YouTube video information
- **video_stats**: Stores historical statistics for videos
- **promo_indicators**: Stores promotional activity indicators

## Database Setup

### Initial Setup

To create the database and initialize all tables:

```bash
npm run init-db
```

Or use the dedicated creation script:

```bash
npm run create-db
```

### Migration

If you have an existing database and need to add the new channels and metrics tables:

```bash
npm run migrate:channels
```

### Seeding Test Data

To populate the database with sample channels and metrics for testing:

```bash
npm run seed:channels
```

This will create:
- 3 sample channels (2 active, 1 inactive)
- 7 days of sample metrics for the active channels

## Database Connection

The database connection is managed through the `src/config/database.js` module:

```javascript
const { getDatabase, closeDatabase } = require('./config/database');

// Get database instance
const db = getDatabase();

// Close database connection
closeDatabase();
```

**Features:**
- Singleton pattern - maintains a single connection
- WAL (Write-Ahead Logging) mode enabled for better concurrency
- Verbose mode for development debugging

## Model Usage

### Channel Model

```javascript
const Channel = require('./models/Channel');

// Create a new channel
const result = Channel.create({
  channel_handle: '@ciidb',
  channel_id: 'UCxxxxxxxxxxxxxx',
  channel_name: 'CII Database Channel',
  is_active: 1
});

// Find channel by ID
const channel = Channel.findById(1);

// Find channel by handle
const channel = Channel.findByHandle('@ciidb');

// Find channel by YouTube channel ID
const channel = Channel.findByChannelId('UCxxxxxxxxxxxxxx');

// Get all channels
const channels = Channel.findAll();

// Get only active channels
const activeChannels = Channel.findActive();

// Update channel
Channel.update(1, {
  channel_name: 'Updated Channel Name',
  is_active: 1
});

// Set channel active status
Channel.setActive(1, false);

// Delete channel
Channel.delete(1);

// Get counts
const totalCount = Channel.count();
const activeCount = Channel.countActive();
```

### LiveStreamMetrics Model

```javascript
const LiveStreamMetrics = require('./models/LiveStreamMetrics');

// Create new metrics
const result = LiveStreamMetrics.create({
  channel_id: 1,
  date: '2024-01-15',
  total_live_stream_views: 5000,
  live_stream_count: 3
});

// Create or update (upsert) - prevents duplicates
LiveStreamMetrics.createOrUpdate({
  channel_id: 1,
  date: '2024-01-15',
  total_live_stream_views: 6000,
  live_stream_count: 4
});

// Find metrics by channel
const metrics = LiveStreamMetrics.findByChannelId(1);

// Find metrics for specific date
const dayMetrics = LiveStreamMetrics.findByChannelIdAndDate(1, '2024-01-15');

// Find metrics in date range
const rangeMetrics = LiveStreamMetrics.findByChannelIdAndDateRange(
  1,
  '2024-01-01',
  '2024-01-31'
);

// Get all metrics with channel info
const allMetrics = LiveStreamMetrics.findAll();

// Get latest metrics for a channel
const latest = LiveStreamMetrics.findLatestByChannelId(1);

// Update metrics
LiveStreamMetrics.update(1, {
  total_live_stream_views: 7000,
  live_stream_count: 5
});

// Delete metrics
LiveStreamMetrics.delete(1);
LiveStreamMetrics.deleteByChannelId(1); // Delete all for a channel

// Get aggregated statistics
const totalViews = LiveStreamMetrics.getTotalViewsByChannelId(1);
const avgViews = LiveStreamMetrics.getAverageViewsByChannelId(1);
const summary = LiveStreamMetrics.getMetricsSummaryByChannelId(1);
// Returns: { total_days, total_views, avg_views, max_views, min_views, total_streams, avg_streams }
```

## Best Practices

### Date Format

Always use ISO 8601 date format (YYYY-MM-DD) for date fields:

```javascript
const today = new Date().toISOString().split('T')[0];
LiveStreamMetrics.create({
  channel_id: 1,
  date: today,
  total_live_stream_views: 1000,
  live_stream_count: 2
});
```

### Transactions

For multiple related operations, use transactions:

```javascript
const { getDatabase } = require('./config/database');
const db = getDatabase();

const transaction = db.transaction(() => {
  const channelResult = Channel.create({
    channel_handle: '@newchannel',
    channel_name: 'New Channel'
  });
  
  LiveStreamMetrics.create({
    channel_id: channelResult.lastInsertRowid,
    date: '2024-01-15',
    total_live_stream_views: 100,
    live_stream_count: 1
  });
});

transaction();
```

### Error Handling

Always handle database errors appropriately:

```javascript
try {
  const channel = Channel.create({
    channel_handle: '@duplicate'
  });
} catch (error) {
  if (error.message.includes('UNIQUE')) {
    console.log('Channel already exists');
  } else {
    throw error;
  }
}
```

### Upsert Pattern

Use `createOrUpdate` for metrics to avoid duplicates:

```javascript
// This safely updates if exists, creates if not
LiveStreamMetrics.createOrUpdate({
  channel_id: 1,
  date: '2024-01-15',
  total_live_stream_views: 5000,
  live_stream_count: 3
});
```

## Query Performance

### Indexes

The schema includes indexes on frequently queried fields:
- Channel lookups by handle
- Active channel filtering
- Metrics lookups by channel and date

### Date Range Queries

Use indexed date range queries for efficient filtering:

```javascript
// Efficient - uses index
const metrics = LiveStreamMetrics.findByChannelIdAndDateRange(
  1,
  '2024-01-01',
  '2024-01-31'
);
```

## Backup and Maintenance

### Backup

To backup the database:

```bash
cp database/promo-indicator.db database/promo-indicator.db.backup
```

Or use SQLite's backup command:

```bash
sqlite3 database/promo-indicator.db ".backup database/backup.db"
```

### Vacuum

Periodically optimize the database:

```bash
sqlite3 database/promo-indicator.db "VACUUM;"
```

### Integrity Check

Verify database integrity:

```bash
sqlite3 database/promo-indicator.db "PRAGMA integrity_check;"
```

## Troubleshooting

### Database Locked

If you encounter "database is locked" errors:
1. Ensure you're not running multiple processes accessing the database
2. Check that WAL mode is enabled (done automatically)
3. Close database connections properly using `closeDatabase()`

### Migration Issues

If migration fails:
1. Check database file permissions
2. Verify the database directory exists
3. Check for syntax errors in SQL statements
4. Review error messages carefully

### Performance Issues

If queries are slow:
1. Verify indexes are created properly
2. Use `EXPLAIN QUERY PLAN` to analyze queries
3. Consider archiving old metrics data
4. Use date range queries instead of full table scans

## Schema Migrations

For future schema changes:

1. Create a new migration script in `src/scripts/`
2. Name it descriptively (e.g., `migrate_add_column_xyz.js`)
3. Add a corresponding npm script in `package.json`
4. Document the migration in this file
5. Test on a backup database first

Example migration template:

```javascript
require('dotenv').config();
const { getDatabase, closeDatabase } = require('../config/database');

console.log('Running migration: [Description]...');

try {
  const db = getDatabase();
  
  db.exec(`
    -- Your migration SQL here
  `);
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error running migration:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
```

## Support

For issues related to the database:
1. Check this documentation
2. Review error messages carefully
3. Test queries using the SQLite CLI
4. Open an issue on the GitHub repository
