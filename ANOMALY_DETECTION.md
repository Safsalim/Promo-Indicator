# Anomaly Detection

This document describes the automatic anomaly detection system for identifying and excluding days with extreme view count spikes.

## Overview

The anomaly detection system automatically identifies days where view counts spike by more than a configurable threshold (default: 1000%) compared to a baseline average. Detected anomalies are automatically marked as excluded from metrics calculations to prevent them from skewing VSI and other analytics.

## Features

- **Automatic Detection**: Identifies view count spikes exceeding 1000% (configurable)
- **Smart Baseline**: Uses 7-day moving average for robust anomaly detection
- **Auto-Exclusion**: Automatically marks detected anomalies as excluded
- **Audit Trail**: Tracks exclusion reason, metadata, and timestamp
- **Manual Override**: Separately tracks manual exclusions vs auto-detected anomalies
- **Restoration**: Can restore auto-excluded anomalies if needed
- **Dry Run Mode**: Preview what would be excluded without making changes
- **API & CLI**: Available via both REST API and command-line interface

## Configuration

Anomaly detection can be configured via environment variables:

```bash
# Spike threshold multiplier (11.0 = 1000% spike)
ANOMALY_SPIKE_THRESHOLD=11.0

# Number of days to use for baseline calculation
ANOMALY_BASELINE_DAYS=7

# Minimum number of days required for baseline
ANOMALY_MIN_BASELINE_DAYS=3

# Enable automatic detection on data collection (not implemented yet)
ANOMALY_AUTO_DETECTION_ENABLED=false

# Run detection during metrics collection (not implemented yet)
ANOMALY_RUN_ON_COLLECTION=false

# Cron schedule for automatic detection (not implemented yet)
ANOMALY_SCHEDULE_CRON=
```

You can also configure these settings in `src/config/anomalyDetection.js`.

## How It Works

### Detection Algorithm

1. **Baseline Calculation**: For each day, calculates the average view count of the previous N days (default: 7)
2. **Spike Detection**: Compares current day views to baseline
3. **Threshold Check**: If `current_views / baseline > threshold`, marks as anomaly
4. **Auto-Exclusion**: Excludes the day with reason `auto_anomaly_detection` and stores metadata

### Baseline Rules

- Only uses non-excluded days for baseline calculation
- Requires minimum 3 days of data for baseline (configurable)
- Skips detection if insufficient baseline data exists

### Exclusion Tracking

Excluded metrics include:
- `is_excluded`: Flag (1 = excluded, 0 = included)
- `exclusion_reason`: Either `manual` or `auto_anomaly_detection`
- `exclusion_metadata`: JSON object with detection details
- `excluded_at`: Timestamp of exclusion

## Command Line Interface

### Basic Usage

```bash
# Detect and exclude anomalies for all channels
npm run detect-anomalies

# Dry run - see what would be excluded without making changes
npm run detect-anomalies:dry-run

# Restore all auto-excluded anomalies
npm run restore-anomalies
```

### Advanced Options

```bash
# Detect for specific channel
node src/scripts/detectAnomalies.js --channel @channelhandle

# Detect with custom threshold (500% spike = 6x multiplier)
node src/scripts/detectAnomalies.js --threshold 6

# Detect for date range
node src/scripts/detectAnomalies.js --start-date 2024-01-01 --end-date 2024-12-31

# List all auto-excluded metrics
node src/scripts/detectAnomalies.js --list-excluded

# Restore for specific channel and date range
node src/scripts/detectAnomalies.js --restore --channel @channelhandle --start-date 2024-01-01
```

### CLI Options

- `--channel <handle>` - Run for specific channel handle
- `--channel-id <id>` - Run for specific channel ID
- `--start-date <YYYY-MM-DD>` - Start date for detection range
- `--end-date <YYYY-MM-DD>` - End date for detection range
- `--threshold <number>` - Spike threshold multiplier (default: 11.0)
- `--baseline-days <number>` - Days for baseline calculation (default: 7)
- `--min-baseline <number>` - Minimum baseline days required (default: 3)
- `--dry-run` - Show what would be excluded without excluding
- `--restore` - Restore auto-excluded anomalies
- `--list-excluded` - List all auto-excluded metrics
- `--help` - Show help message

## REST API

### Detect Anomalies

```http
POST /api/anomalies/detect
Content-Type: application/json

{
  "channel_id": 1,                // Optional: specific channel
  "start_date": "2024-01-01",     // Optional: date range start
  "end_date": "2024-12-31",       // Optional: date range end
  "spike_threshold": 11.0,        // Optional: custom threshold
  "baseline_days": 7,             // Optional: custom baseline days
  "min_baseline_days": 3,         // Optional: custom min baseline
  "dry_run": false                // Optional: dry run mode
}
```

### Restore Auto-Excluded Anomalies

```http
POST /api/anomalies/restore
Content-Type: application/json

{
  "channel_id": 1,                // Optional: specific channel
  "start_date": "2024-01-01",     // Optional: date range start
  "end_date": "2024-12-31"        // Optional: date range end
}
```

### Get Excluded Metrics

```http
GET /api/metrics/excluded?auto_only=true&channel_id=1
```

Query parameters:
- `auto_only=true` - Only return auto-detected anomalies
- `channel_id=<id>` - Filter by channel

### Manual Exclusion/Restoration

```http
# Exclude a metric manually
POST /api/metrics/:id/exclude
Content-Type: application/json

{
  "reason": "manual",
  "metadata": {
    "note": "Special event"
  }
}

# Restore a metric
POST /api/metrics/:id/restore
```

### Get Configuration

```http
GET /api/anomalies/config
```

## Database Schema

The `live_stream_metrics` table includes these columns for exclusion tracking:

```sql
CREATE TABLE live_stream_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  total_live_stream_views INTEGER DEFAULT 0,
  live_stream_count INTEGER DEFAULT 0,
  peak_video_id TEXT,
  is_excluded INTEGER DEFAULT 0,
  exclusion_reason TEXT,
  exclusion_metadata TEXT,
  excluded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id),
  UNIQUE(channel_id, date)
);
```

## Integration with Existing Systems

### VSI Calculator

The VSI calculator already filters out excluded metrics:

```javascript
const metricsForCalculation = metrics.filter(m => !m.is_excluded || m.is_excluded === 0);
```

Auto-excluded anomalies are automatically excluded from VSI calculations.

### Metrics Collection

Currently, anomaly detection is run separately after metrics collection. Future enhancements could integrate it directly into the collection process.

## Examples

### Example 1: Detect and exclude 1000% spikes

```bash
# Preview what would be excluded
npm run detect-anomalies:dry-run

# If results look good, run for real
npm run detect-anomalies
```

### Example 2: Custom threshold for 500% spikes

```bash
node src/scripts/detectAnomalies.js --threshold 6 --dry-run
```

### Example 3: Detect for specific time period

```bash
node src/scripts/detectAnomalies.js \
  --start-date 2024-01-01 \
  --end-date 2024-06-30 \
  --dry-run
```

### Example 4: Restore all auto-excluded anomalies

```bash
npm run restore-anomalies
```

### Example 5: API-based detection

```bash
curl -X POST http://localhost:3000/api/anomalies/detect \
  -H "Content-Type: application/json" \
  -d '{
    "dry_run": true,
    "spike_threshold": 11.0
  }'
```

## Troubleshooting

### No anomalies detected

- Check if you have enough data (requires at least 3+ days of baseline)
- Verify the threshold is appropriate for your data
- Use `--dry-run` to see detection details

### Too many false positives

- Increase the spike threshold: `--threshold 15` (for 1400% spike)
- Increase baseline days: `--baseline-days 14`
- Increase minimum baseline: `--min-baseline 5`

### Restore accidentally excluded metrics

```bash
# Restore all auto-excluded
npm run restore-anomalies

# Or restore for specific date range
node src/scripts/detectAnomalies.js --restore --start-date 2024-01-01
```

## Future Enhancements

- Automatic detection on metrics collection
- Scheduled detection via cron
- Email/Discord notifications for detected anomalies
- Machine learning-based anomaly detection
- Multiple detection strategies (Z-score, IQR, etc.)
- Frontend UI for reviewing and managing anomalies
