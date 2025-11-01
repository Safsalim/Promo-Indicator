# Live Stream Metrics Collection Service

## Overview

This document describes the live stream metrics collection service implementation for the Promo-Indicator project.

## Components

### 1. Live Stream Collector Service (`src/services/liveStreamCollector.js`)

Core service that handles data collection from YouTube API.

**Features:**
- Fetches completed live streams for channels within a date range
- Retrieves video statistics (view counts) from YouTube API
- Groups streams by date and calculates daily totals
- Stores metrics in the database with duplicate handling
- Comprehensive error handling and logging
- Support for dry-run mode (preview without saving)

**Key Methods:**
- `getChannelIdByHandle(handle)` - Resolve YouTube channel ID from handle
- `getLiveStreamsForDateRange(channelId, startDate, endDate)` - Fetch live streams
- `getVideoStatistics(videoIds)` - Get view counts and statistics
- `groupStreamsByDate(streams, statistics)` - Aggregate daily metrics
- `collectMetricsForChannel(channelDbId, channelId, startDate, endDate, dryRun)` - Process single channel
- `collectMetrics(options)` - Main collection orchestrator

### 2. Collection CLI (`src/scripts/collectLiveStreamMetrics.js`)

Command-line interface for running data collection.

**Command-line Options:**
- `-h, --help` - Show help message
- `-s, --start-date DATE` - Start date (YYYY-MM-DD, default: yesterday)
- `-e, --end-date DATE` - End date (YYYY-MM-DD, default: same as start date)
- `-c, --channels IDS` - Comma-separated channel IDs (default: all active channels)
- `-d, --dry-run` - Preview mode without saving data

**Usage Examples:**
```bash
# Collect yesterday's data (default)
npm run collect-metrics

# Specific date
npm run collect-metrics -- --start-date 2024-01-15

# Date range
npm run collect-metrics -- --start-date 2024-01-01 --end-date 2024-01-31

# Specific channels only
npm run collect-metrics -- --channels 1,2,3

# Dry run
npm run collect-metrics -- --dry-run
```

### 3. Channel Management CLI (`src/scripts/manageChannels.js`)

Command-line tool for managing tracked channels.

**Commands:**
- `list` - List all tracked channels
- `list-active` - List only active channels
- `add <handle>` - Add new channel by YouTube handle
- `enable <id>` - Enable channel tracking
- `disable <id>` - Disable channel tracking
- `info <id>` - Show channel details
- `delete <id>` - Delete channel and all metrics
- `help` - Show help message

**Usage Examples:**
```bash
# List all channels
npm run manage-channels list

# Add new channel
npm run manage-channels add @channelname

# Enable/disable tracking
npm run manage-channels disable 1
npm run manage-channels enable 1

# View channel info
npm run manage-channels info 1

# Delete channel
npm run manage-channels delete 1
```

## Data Flow

1. **Channel Selection**: 
   - Get active channels from database (or specific channels if provided)
   - Validate channel has YouTube channel ID

2. **Live Stream Discovery**:
   - Query YouTube API search endpoint
   - Filter by `eventType=completed` for past live streams
   - Filter by date range (publishedAfter/publishedBefore)
   - Paginate through all results

3. **Statistics Retrieval**:
   - Batch video IDs (max 50 per request)
   - Query YouTube API videos endpoint
   - Extract view counts and metadata

4. **Data Aggregation**:
   - Group live streams by published date
   - Sum view counts for each date
   - Count number of streams per date

5. **Database Storage**:
   - Use `createOrUpdate` to handle duplicates
   - Unique constraint on (channel_id, date) ensures one record per channel per day
   - Log success/failure for each operation

## Logging

The collection service provides comprehensive logging:

### Collection Start
```
============================================================
Live Stream Metrics Collection
============================================================
Date range: 2024-01-15 to 2024-01-15
============================================================
Processing 2 active channel(s)...
```

### Per-Channel Logs
```
Processing channel ID 1 (UC1234567890abcdefg)...
Date range: 2024-01-15 to 2024-01-15
Found 3 potential live stream(s).
Processing 1 date(s) with live stream data.
✓ Stored: Date=2024-01-15, Views=5000, Count=3
```

### Error Logs
```
✗ Failed to store metrics for date 2024-01-15: Database error
Error collecting metrics for channel 1: API quota exceeded
```

### Summary Report
```
============================================================
Collection Summary
============================================================
Total channels: 2
Successful: 2
Failed: 0
============================================================
```

## Error Handling

The service handles various error conditions:

1. **Channel Not Found**: Logs error and continues with other channels
2. **API Quota Exceeded**: Reports error and exits with failure code
3. **No Live Streams Found**: Logs informational message, not an error
4. **Database Errors**: Logs error details and continues
5. **Invalid Date Format**: Validates dates before processing
6. **Missing API Key**: Fails early with clear error message

## Scheduling

The collection service is designed to run on a schedule. See [SCHEDULING.md](./SCHEDULING.md) for detailed setup instructions for:

- Linux/macOS (cron)
- Windows (Task Scheduler)
- systemd timers
- Docker/Kubernetes
- Cloud platforms (AWS, GCP, Azure)

**Recommended Schedule:**
- Daily at 2 AM for previous day's data
- Weekly backfill for any missed days
- Manual runs for historical data

## YouTube API Quota Management

**Quota Costs:**
- Search (live streams): 100 units per request
- Videos (statistics): 1 unit per request
- Channel lookup: 100 units per request (channel management)

**Estimated Daily Usage:**
- 1 channel, 1 day: ~101-150 units (1 search + 1-50 video requests)
- 5 channels, 1 day: ~505-750 units
- Default quota: 10,000 units/day

**Optimization Tips:**
1. Process channels at different times to spread quota usage
2. Use date ranges to collect multiple days at once
3. Disable inactive channels
4. Monitor quota in Google Cloud Console

## Database Schema

### channels table
```sql
CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_handle TEXT UNIQUE NOT NULL,
  channel_id TEXT,
  channel_name TEXT,
  added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1
);
```

### live_stream_metrics table
```sql
CREATE TABLE live_stream_metrics (
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

## Testing

### Manual Testing

1. **Verify Database Setup:**
   ```bash
   npm run create-db
   ```

2. **Add Test Channel:**
   ```bash
   npm run manage-channels add @channelname
   ```

3. **Run Dry Collection:**
   ```bash
   npm run collect-metrics -- --dry-run
   ```

4. **Run Actual Collection:**
   ```bash
   npm run collect-metrics
   ```

5. **Verify Data:**
   ```bash
   sqlite3 database/promo-indicator.db "SELECT * FROM live_stream_metrics"
   ```

### Automated Testing

To add automated tests, create test files in `tests/` directory:

```javascript
const assert = require('assert');
const liveStreamCollector = require('../src/services/liveStreamCollector');

// Test date validation
assert(liveStreamCollector.getPreviousDay().match(/^\d{4}-\d{2}-\d{2}$/));

// Test with mock data
// ... additional tests
```

## Troubleshooting

### No Data Collected

**Possible Causes:**
1. No active channels in database
2. Channels have no live streams in date range
3. YouTube API key not configured or invalid
4. API quota exceeded

**Solutions:**
- Verify channels: `npm run manage-channels list-active`
- Check date range is correct
- Verify API key in `.env` file
- Check quota in Google Cloud Console

### Permission Errors

**Symptoms:**
- Cannot write to database
- Cannot create log files

**Solutions:**
- Check file permissions: `ls -la database/`
- Ensure user has write access
- Create directories: `mkdir -p logs database`

### API Rate Limiting

**Symptoms:**
- "API quota exceeded" errors
- "Too many requests" errors

**Solutions:**
- Reduce number of channels processed
- Spread collections throughout the day
- Request quota increase from Google
- Use smaller date ranges

## Monitoring

### Success Indicators
- Exit code 0
- "Successful: N" in summary where N > 0
- Log contains "✓ Stored" entries
- Database contains new records

### Failure Indicators
- Exit code 1
- "Failed: N" in summary where N > 0
- Error messages in logs
- No new database records

### Health Check Query
```sql
-- Check last collection date
SELECT 
  c.channel_handle,
  MAX(lsm.date) as last_collected,
  COUNT(*) as total_days
FROM live_stream_metrics lsm
JOIN channels c ON lsm.channel_id = c.id
GROUP BY c.id;
```

## Best Practices

1. **Always test with dry-run first** before production collection
2. **Backup database** before major collection runs
3. **Monitor logs** regularly for errors
4. **Keep channels updated** - disable inactive ones
5. **Spread collections** throughout the day for API quota
6. **Use date ranges** for efficient backfilling
7. **Set up alerts** for collection failures
8. **Rotate logs** to prevent disk space issues

## Future Enhancements

Potential improvements for future versions:

- [ ] Parallel channel processing for faster collection
- [ ] Retry logic for transient API failures
- [ ] Incremental collection (only new live streams)
- [ ] Real-time collection via webhooks
- [ ] Metrics aggregation and reporting
- [ ] Email notifications for collection status
- [ ] Web UI for channel management
- [ ] API endpoints for collection status
- [ ] Historical data visualization
- [ ] Automated anomaly detection

## Support

For issues or questions:
1. Check logs for error messages
2. Review [SCHEDULING.md](./SCHEDULING.md) for setup help
3. Verify database schema with [DATABASE.md](./DATABASE.md)
4. Open an issue on GitHub with logs and configuration details
