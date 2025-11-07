# Database Migration History

This document tracks all database schema changes and migrations for the Promo-Indicator project.

## Migration Log

### Migration 001: Initial Schema (Base)
**Date**: Initial Project Setup  
**Script**: `src/models/schema.js` (original tables)  
**Status**: ✅ Completed

**Tables Created:**
- `videos` - YouTube video information
- `video_stats` - Historical video statistics
- `promo_indicators` - Promotional activity indicators

**Indexes Created:**
- `idx_video_stats_video_id`
- `idx_video_stats_recorded_at`
- `idx_promo_indicators_video_id`
- `idx_videos_channel_id`

---

### Migration 002: YouTube Channels and Live Stream Metrics
**Date**: 2024  
**Script**: `src/scripts/migrateChannelsAndMetrics.js`  
**Models**: `Channel.js`, `LiveStreamMetrics.js`  
**Status**: ✅ Completed

**Purpose**: Add support for tracking YouTube channel configurations and daily live stream metrics.

**Tables Created:**

#### channels
```sql
CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_handle TEXT UNIQUE NOT NULL,
  channel_id TEXT,
  channel_name TEXT,
  added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1
);
```

**Fields:**
- `id` - Primary key, auto-increment
- `channel_handle` - YouTube handle (e.g., "@ciidb"), unique constraint
- `channel_id` - YouTube channel ID from API
- `channel_name` - Display name
- `added_date` - Timestamp when channel was added
- `is_active` - Boolean flag (1=active, 0=inactive) for enabling/disabling tracking

#### live_stream_metrics
```sql
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
```

**Fields:**
- `id` - Primary key, auto-increment
- `channel_id` - Foreign key to channels table
- `date` - Date in YYYY-MM-DD format
- `total_live_stream_views` - Cumulative views for all live streams on that date
- `live_stream_count` - Number of live streams detected that day
- `created_at` - Timestamp for record creation/update

**Constraints:**
- UNIQUE constraint on `(channel_id, date)` - ensures one record per channel per day

**Indexes Created:**
- `idx_channels_channel_handle` - Fast lookups by handle
- `idx_channels_is_active` - Efficient filtering of active channels
- `idx_live_stream_metrics_channel_id` - Fast channel-based queries
- `idx_live_stream_metrics_date` - Date range query optimization

**How to Apply:**
```bash
npm run migrate:channels
```

**Rollback**: Not applicable - uses IF NOT EXISTS, safe to run multiple times

---

### Migration 003: Add is_excluded Column to Live Stream Metrics
**Date**: 2024  
**Script**: `src/scripts/addExcludedColumn.js`  
**Status**: ✅ Completed

**Purpose**: Add support for excluding anomalous data days from calculations in the live stream metrics table.

**Schema Changes:**
```sql
ALTER TABLE live_stream_metrics ADD COLUMN is_excluded INTEGER DEFAULT 0;
```

**Fields Added:**
- `is_excluded` - Boolean flag (0=included, 1=excluded) for excluding anomalous days from calculations

**How to Apply:**
```bash
npm run migrate:excluded-column
```

**Verification:**
```bash
# Check if column exists
sqlite3 database/promo-indicator.db "PRAGMA table_info(live_stream_metrics);"

# Should show is_excluded column in the output
```

**Rollback**: Not applicable - column addition is permanent, but can be set to 0 to include all data

---

## How to Run Migrations

### Fresh Database Setup
For new installations, initialize all tables at once:
```bash
npm run init-db
```

### Existing Database
For existing databases, run specific migrations:
```bash
npm run migrate:channels
npm run migrate:excluded-column
```

### Verify Migration
After running a migration, verify the changes:
```bash
# Check tables
sqlite3 database/promo-indicator.db ".tables"

# Check schema
sqlite3 database/promo-indicator.db ".schema channels"
sqlite3 database/promo-indicator.db ".schema live_stream_metrics"

# Check indexes
sqlite3 database/promo-indicator.db ".indexes"
```

## Creating New Migrations

When you need to modify the database schema:

### 1. Create Migration Script
Create a new file in `src/scripts/` with a descriptive name:
```
src/scripts/migrate_add_feature_xyz.js
```

### 2. Migration Template
Use this template for new migrations:

```javascript
require('dotenv').config();
const { getDatabase, closeDatabase } = require('../config/database');

console.log('Running migration: [Description]...');

try {
  const db = getDatabase();

  // Your SQL statements here
  db.exec(`
    CREATE TABLE IF NOT EXISTS your_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_your_table_field ON your_table(field);
  `);

  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Error running migration:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
```

### 3. Add npm Script
Add to `package.json`:
```json
"scripts": {
  "migrate:feature-xyz": "node src/scripts/migrate_add_feature_xyz.js"
}
```

### 4. Update Models
Create or update model files in `src/models/` with CRUD operations.

### 5. Test Migration
```bash
# Run migration
npm run migrate:feature-xyz

# Test models
npm run test:models
```

### 6. Document
Add entry to this file (MIGRATIONS.md) with:
- Migration number
- Date
- Purpose
- Schema changes
- How to apply/rollback

## Best Practices

### Use IF NOT EXISTS
Always use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`:
```sql
CREATE TABLE IF NOT EXISTS my_table (...);
CREATE INDEX IF NOT EXISTS idx_my_field ON my_table(field);
```

### Foreign Keys
Enable foreign keys and use them for referential integrity:
```sql
FOREIGN KEY (channel_id) REFERENCES channels(id)
```

### Unique Constraints
Use unique constraints to prevent duplicates:
```sql
UNIQUE(channel_id, date)
```

### Indexes
Create indexes on:
- Foreign keys
- Fields used in WHERE clauses
- Fields used in ORDER BY
- Composite keys in unique constraints

### Date Format
Always use TEXT type with ISO 8601 format (YYYY-MM-DD) for dates:
```javascript
const date = new Date().toISOString().split('T')[0];
```

### Transactions
For multiple related changes, use transactions:
```javascript
const db = getDatabase();
const migrate = db.transaction(() => {
  db.exec(`CREATE TABLE ...`);
  db.exec(`CREATE INDEX ...`);
});
migrate();
```

## Schema Versioning

Current schema version: **3**

Track schema version in your application:
```javascript
// In src/config/database.js
const SCHEMA_VERSION = 2;

function checkSchemaVersion() {
  const db = getDatabase();
  // Implement version checking logic
}
```

## Backup Before Migration

Always backup your database before running migrations:
```bash
# Create backup
cp database/promo-indicator.db database/promo-indicator.db.backup

# Or use SQLite backup command
sqlite3 database/promo-indicator.db ".backup database/backup.db"
```

## Troubleshooting Migrations

### Migration Fails Midway
1. Check error message carefully
2. Verify SQL syntax
3. Check for constraint violations
4. Restore from backup if needed

### Performance Issues After Migration
1. Run ANALYZE to update statistics:
   ```bash
   sqlite3 database/promo-indicator.db "ANALYZE;"
   ```
2. Rebuild indexes if needed:
   ```bash
   sqlite3 database/promo-indicator.db "REINDEX;"
   ```

### Foreign Key Violations
1. Ensure referenced records exist
2. Check data integrity before adding foreign keys
3. Use CASCADE options if appropriate

## Testing Migrations

Before deploying migrations to production:

1. **Test on backup database**
   ```bash
   cp database/promo-indicator.db database/test.db
   DATABASE_PATH=database/test.db npm run migrate:your-migration
   ```

2. **Verify data integrity**
   ```bash
   sqlite3 database/test.db "PRAGMA integrity_check;"
   ```

3. **Test application functionality**
   ```bash
   npm run test:models
   ```

4. **Benchmark performance**
   - Test query performance
   - Check index usage with EXPLAIN QUERY PLAN

## Support

For migration issues:
1. Review this document
2. Check [DATABASE.md](./DATABASE.md) for schema details
3. Test on a backup database first
4. Open an issue on GitHub if problems persist
