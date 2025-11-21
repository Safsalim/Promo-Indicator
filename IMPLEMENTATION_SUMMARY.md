# Anomaly Detection Implementation Summary

## Overview
Implemented automatic anomaly detection and exclusion system for identifying days with view count spikes exceeding 1000% of baseline.

## Features Implemented

### 1. Database Schema Updates
**File**: `src/config/database.js`
- Added `is_excluded` (INTEGER) - Flag for excluded metrics
- Added `exclusion_reason` (TEXT) - Tracks manual vs auto-detected exclusions
- Added `exclusion_metadata` (TEXT) - JSON metadata with detection details
- Added `excluded_at` (DATETIME) - Timestamp of exclusion
- Added index on `is_excluded` for query performance

### 2. LiveStreamMetrics Model Extensions
**File**: `src/models/LiveStreamMetrics.js`

**New Methods:**
- `excludeById(id, reason, metadata)` - Exclude metric by ID
- `excludeDay(channelId, date, reason, metadata)` - Exclude by channel and date
- `restoreById(id)` - Restore excluded metric
- `restoreDay(channelId, date)` - Restore by channel and date
- `findExcluded()` - Find all excluded metrics
- `findExcludedByChannelId(channelId)` - Find excluded for channel
- `findAutoExcluded()` - Find only auto-detected anomalies

### 3. Anomaly Detection Service
**File**: `src/services/anomalyDetector.js`

**Features:**
- Configurable spike threshold (default: 11.0x = 1000%)
- Smart baseline calculation using 7-day moving average
- Requires minimum 3 days for baseline
- Dry run mode for preview
- Auto-exclusion with audit trail
- Restoration of auto-excluded anomalies
- Separate handling of manual vs auto exclusions

**Key Methods:**
- `detectAnomaliesForChannel(channelId, startDate, endDate)` - Detect for one channel
- `detectAnomaliesForAllChannels(startDate, endDate)` - Detect for all active channels
- `getAutoExcludedMetrics()` - Get all auto-excluded metrics
- `restoreAutoExcludedMetrics(channelId, startDate, endDate)` - Restore with filters

### 4. Configuration System
**File**: `src/config/anomalyDetection.js`

**Environment Variables:**
- `ANOMALY_SPIKE_THRESHOLD` - Spike threshold multiplier (default: 11.0)
- `ANOMALY_BASELINE_DAYS` - Days for baseline (default: 7)
- `ANOMALY_MIN_BASELINE_DAYS` - Minimum baseline days (default: 3)
- `ANOMALY_AUTO_DETECTION_ENABLED` - Enable automatic detection (default: false)
- `ANOMALY_RUN_ON_COLLECTION` - Run after collection (default: false)

### 5. CLI Script
**File**: `src/scripts/detectAnomalies.js`

**Commands:**
```bash
# Basic detection
npm run detect-anomalies

# Dry run
npm run detect-anomalies:dry-run

# Restore
npm run restore-anomalies

# Advanced options
node src/scripts/detectAnomalies.js --channel @handle --threshold 6 --dry-run
```

**Options:**
- `--channel <handle>` - Specific channel handle
- `--channel-id <id>` - Specific channel ID
- `--start-date <date>` - Start date filter
- `--end-date <date>` - End date filter
- `--threshold <number>` - Custom threshold
- `--baseline-days <number>` - Custom baseline days
- `--min-baseline <number>` - Custom min baseline
- `--dry-run` - Preview mode
- `--restore` - Restore auto-excluded
- `--list-excluded` - List all auto-excluded
- `--help` - Show help

### 6. REST API Endpoints
**File**: `src/routes/dashboard.js`

**New Endpoints:**
- `POST /api/anomalies/detect` - Detect and exclude anomalies
  - Body: `{ channel_id, start_date, end_date, spike_threshold, baseline_days, dry_run }`
- `POST /api/anomalies/restore` - Restore auto-excluded anomalies
  - Body: `{ channel_id, start_date, end_date }`
- `GET /api/anomalies/config` - Get configuration
- `POST /api/metrics/:id/exclude` - Manual exclusion
  - Body: `{ reason, metadata }`
- `POST /api/metrics/:id/restore` - Restore metric
- `GET /api/metrics/excluded` - List excluded metrics
  - Query: `?auto_only=true&channel_id=1`

### 7. Documentation
**Files Created/Updated:**
- `ANOMALY_DETECTION.md` - Comprehensive feature documentation
- `README.md` - Added anomaly detection section
- `.env.example` - Added configuration variables
- `IMPLEMENTATION_SUMMARY.md` - This file

### 8. Tests
**Files Created:**
- `src/tests/anomalyDetector.test.js` - Unit tests for detector service
- `src/tests/anomalyApi.test.js` - Integration tests for API endpoints

**NPM Scripts:**
- `npm run test:anomaly-detector` - Run unit tests
- `npm run test:anomaly-api` - Run API tests

## Algorithm Details

### Baseline Calculation
1. For each metric day, collect previous N days (default: 7)
2. Filter out already excluded days
3. Require minimum M days (default: 3) for valid baseline
4. Calculate average: `baseline = sum(views) / count(days)`

### Spike Detection
1. Compare current day to baseline: `ratio = current_views / baseline`
2. If `ratio > threshold`, mark as anomaly
3. Calculate percentage spike: `(ratio - 1) * 100`

### Auto-Exclusion
1. Mark metric with `is_excluded = 1`
2. Set `exclusion_reason = 'auto_anomaly_detection'`
3. Store metadata: `{ baseline_days, baseline_avg, spike_threshold, detection_time }`
4. Record `excluded_at = CURRENT_TIMESTAMP`

### Integration with VSI
The VSI calculator already filters excluded metrics:
```javascript
const metricsForCalculation = metrics.filter(m => !m.is_excluded || m.is_excluded === 0);
```

## Usage Examples

### CLI Usage
```bash
# Detect anomalies with default 1000% threshold
npm run detect-anomalies

# Preview without excluding
npm run detect-anomalies:dry-run

# Custom 500% threshold (6x multiplier)
node src/scripts/detectAnomalies.js --threshold 6

# Detect for specific channel
node src/scripts/detectAnomalies.js --channel @ciidb

# Detect for date range
node src/scripts/detectAnomalies.js --start-date 2024-01-01 --end-date 2024-12-31

# List auto-excluded
node src/scripts/detectAnomalies.js --list-excluded

# Restore all auto-excluded
npm run restore-anomalies
```

### API Usage
```bash
# Detect (dry run)
curl -X POST http://localhost:3000/api/anomalies/detect \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "spike_threshold": 11.0}'

# Get configuration
curl http://localhost:3000/api/anomalies/config

# List excluded
curl http://localhost:3000/api/metrics/excluded?auto_only=true

# Restore auto-excluded
curl -X POST http://localhost:3000/api/anomalies/restore \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Testing

### Unit Tests
```bash
npm run test:anomaly-detector
```

**Test Coverage:**
- Dry run detection
- Real detection and exclusion
- Verification of exclusion in database
- Restoration of excluded metrics
- Custom threshold testing

### API Tests
```bash
npm run test:anomaly-api
```

**Test Coverage:**
- Get configuration endpoint
- List excluded metrics
- Detect anomalies (dry run)
- Filter auto-excluded metrics

## Configuration Examples

### Environment Variables (.env)
```env
# Default 1000% spike
ANOMALY_SPIKE_THRESHOLD=11.0

# Use 14-day baseline
ANOMALY_BASELINE_DAYS=14

# Require 5 days minimum
ANOMALY_MIN_BASELINE_DAYS=5

# Enable automatic detection (future feature)
ANOMALY_AUTO_DETECTION_ENABLED=false
```

### Custom Threshold Calculations
- 500% spike: threshold = 6.0
- 1000% spike: threshold = 11.0 (default)
- 2000% spike: threshold = 21.0
- 5000% spike: threshold = 51.0

Formula: `threshold = (percentage / 100) + 1`

## Files Changed/Created

### Created
- `src/services/anomalyDetector.js` - Main detector service
- `src/scripts/detectAnomalies.js` - CLI script
- `src/config/anomalyDetection.js` - Configuration
- `src/tests/anomalyDetector.test.js` - Unit tests
- `src/tests/anomalyApi.test.js` - API tests
- `ANOMALY_DETECTION.md` - Feature documentation
- `IMPLEMENTATION_SUMMARY.md` - This file

### Modified
- `src/config/database.js` - Added exclusion columns
- `src/models/LiveStreamMetrics.js` - Added exclusion methods
- `src/routes/dashboard.js` - Added API endpoints
- `package.json` - Added NPM scripts
- `.env.example` - Added configuration variables
- `README.md` - Added feature documentation

## Backward Compatibility

The implementation is fully backward compatible:
- Existing databases work without migration (columns are optional)
- VSI calculator handles missing `is_excluded` column
- Default behavior unchanged (all metrics included unless explicitly excluded)
- No breaking changes to existing APIs

## Future Enhancements

Potential improvements for future iterations:
- Automatic detection on metrics collection
- Scheduled detection via cron
- Email/Discord notifications for detected anomalies
- Machine learning-based anomaly detection
- Multiple detection strategies (Z-score, IQR, etc.)
- Frontend UI for reviewing and managing anomalies
- Batch operations for bulk exclusion/restoration
- Export/import of exclusion rules

## Performance Considerations

- Baseline calculation is O(n) per metric day
- Detection runs in single pass through metrics
- Database indexes on `is_excluded` improve query performance
- Dry run mode allows preview without database writes
- Auto-excluded metrics tracked separately for easy restoration

## Acceptance Criteria Met

✅ System detects days with view counts exceeding 1000% of baseline
✅ Anomalous days are automatically marked as excluded
✅ Metric recalculation triggered after anomalies removed (VSI calculator filters excluded)
✅ Configuration for spike threshold is easily adjustable
✅ Logging/audit trail of excluded days with reason and metadata
✅ Does not affect manually excluded anomalies (separate tracking via exclusion_reason)

## Conclusion

The anomaly detection system is fully implemented, tested, and documented. It provides:
- Automatic detection of extreme spikes
- Flexible configuration
- Both CLI and API interfaces
- Comprehensive audit trail
- Easy restoration of excluded data
- Full backward compatibility

The system is ready for production use.
