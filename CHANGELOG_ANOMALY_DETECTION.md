# Anomaly Detection Algorithm Change - Day-to-Day Comparison

## Summary

The anomaly detection algorithm has been updated to compare each day's view count to the immediately previous day, rather than using a 7-day moving average baseline. This provides a simpler, more direct detection of sudden spikes.

## What Changed

### Before (Moving Average Baseline)
- Calculated 7-day moving average of previous days
- Compared current day to baseline average
- Formula: `current_views / baseline_avg > 11.0`
- Required minimum 3 days of data for baseline

### After (Day-to-Day Comparison)
- Finds immediately previous non-excluded day
- Compares current day to previous day directly
- Formula: `current_views / previous_views > 10.0`
- Requires at least 2 consecutive days of data

## Key Differences

### Threshold Change
- **Old**: 11.0x (representing 1000% spike from baseline)
- **New**: 10.0x (representing 1000% increase from previous day)

The threshold is now more intuitive - a threshold of 10.0 means exactly 10x the previous day's views.

### Detection Logic
- **Old**: Used averaged view count from multiple previous days
- **New**: Uses single previous day's view count

This makes detection more sensitive to sudden day-over-day changes, which is more aligned with the ticket requirement.

### Metadata Stored
- **Old**: Stored `baseline_avg`, `baseline_days`, `spike_threshold`
- **New**: Stores `previous_day`, `previous_views`, `spike_threshold`

The metadata now clearly shows which specific day was used for comparison.

## Configuration Changes

### Environment Variables
- **Changed**: `ANOMALY_SPIKE_THRESHOLD` default: 11.0 → 10.0
- **Removed**: `ANOMALY_BASELINE_DAYS` (was for averaging)
- **Removed**: `ANOMALY_MIN_BASELINE_DAYS` (was for minimum baseline)
- **Added**: `ANOMALY_LOOKBACK_DAYS` (default: 7, for finding previous day)

### Configuration File (`src/config/anomalyDetection.js`)
```javascript
// Old
{
  spikeThreshold: 11.0,
  baselineDays: 7,
  minBaselineDays: 3
}

// New
{
  spikeThreshold: 10.0,
  lookbackDays: 7
}
```

### AnomalyDetector Class
```javascript
// Old
new AnomalyDetector({
  spikeThreshold: 11.0,
  baselineDays: 7,
  minBaselineDays: 3,
  dryRun: false
});

// New
new AnomalyDetector({
  spikeThreshold: 10.0,
  lookbackDays: 7,
  dryRun: false
});
```

## API Changes

### POST /api/anomalies/detect

**Old request body:**
```json
{
  "spike_threshold": 11.0,
  "baseline_days": 7,
  "min_baseline_days": 3,
  "dry_run": false
}
```

**New request body:**
```json
{
  "spike_threshold": 10.0,
  "lookback_days": 7,
  "dry_run": false
}
```

### Response Format

**Old anomaly object:**
```json
{
  "id": 123,
  "date": "2024-01-15",
  "views": 25000,
  "baseline": 2200,
  "ratio": "11.36",
  "percentage_spike": "1036.4"
}
```

**New anomaly object:**
```json
{
  "id": 123,
  "date": "2024-01-15",
  "views": 25000,
  "previous_day": "2024-01-14",
  "previous_views": 2200,
  "ratio": "11.36",
  "percentage_increase": "1036.4"
}
```

## CLI Changes

### Command Line Options

**Removed:**
- `--baseline-days` - No longer needed
- `--min-baseline` - No longer needed

**Added:**
- `--lookback-days <number>` - Days to look back for previous day (default: 7)

**Changed:**
- `--threshold` default: 11.0 → 10.0

### Example Output

**Old:**
```
[AnomalyDetector] Auto-excluded: @channel on 2024-01-08 - 12000 views (990.9% spike, baseline: 1100)
```

**New:**
```
[AnomalyDetector] Auto-excluded: @channel on 2024-01-08 - 12000 views (990.9% increase from 1100 on 2024-01-07, ratio: 10.91x)
```

## Edge Cases Handled

1. **First Day**: Skipped (no previous day to compare)
2. **Previous Day with 0 Views**: Skipped (division by zero)
3. **Previous Day Excluded**: Looks back up to `lookbackDays` for non-excluded day
4. **No Valid Previous Day**: Detection skipped for that day

## Migration Guide

### For Users

No database migration needed. The algorithm change is backward compatible with existing exclusion data.

#### If you were using custom thresholds:
- **500% spike (6.0x)**: No change needed, still use `--threshold 6`
- **1000% spike (11.0x)**: Change to `--threshold 10`
- **2000% spike (21.0x)**: Change to `--threshold 20`

The threshold is now more intuitive - it directly represents the multiplier.

### For Developers

#### Update Configuration Instantiation
```javascript
// Old
const detector = new AnomalyDetector({
  spikeThreshold: 11.0,
  baselineDays: 7,
  minBaselineDays: 3
});

// New
const detector = new AnomalyDetector({
  spikeThreshold: 10.0,
  lookbackDays: 7
});
```

#### Update API Calls
```javascript
// Old
fetch('/api/anomalies/detect', {
  method: 'POST',
  body: JSON.stringify({
    baseline_days: 7,
    min_baseline_days: 3
  })
});

// New
fetch('/api/anomalies/detect', {
  method: 'POST',
  body: JSON.stringify({
    lookback_days: 7
  })
});
```

#### Update Response Parsing
```javascript
// Old
anomalies.forEach(a => {
  console.log(`Spike: ${a.percentage_spike}%, baseline: ${a.baseline}`);
});

// New
anomalies.forEach(a => {
  console.log(`Increase: ${a.percentage_increase}% from ${a.previous_views} on ${a.previous_day}`);
});
```

## Testing

All tests have been updated and pass successfully:
```bash
npm run test:anomaly-detector
```

## Documentation Updated

- ✅ `ANOMALY_DETECTION.md` - Full documentation
- ✅ `ANOMALY_DETECTION_QUICK_START.md` - Quick start guide
- ✅ `README.md` - Feature overview
- ✅ `src/tests/anomalyDetector.test.js` - Test suite
- ✅ `src/scripts/detectAnomalies.js` - CLI script
- ✅ `src/routes/dashboard.js` - API routes
- ✅ `src/services/anomalyDetector.js` - Core implementation
- ✅ `src/config/anomalyDetection.js` - Configuration

## Rationale

This change aligns with the ticket requirements:
- ✅ "Compare each day to the immediately previous day"
- ✅ "Detection logic: if today_views / yesterday_views > 10, mark as anomalous"
- ✅ "Apply multiplier check: if current_day_views > (previous_day_views * 10)"

The new algorithm is:
- **Simpler**: No averaging or baseline calculation needed
- **More direct**: Clear comparison to immediate previous day
- **More intuitive**: Threshold directly represents the multiplier
- **Better aligned**: Matches the ticket requirements exactly

## Backward Compatibility

✅ Existing exclusion data remains valid
✅ Restoration functionality unchanged
✅ Database schema unchanged
✅ Manual exclusions unaffected
✅ VSI calculator integration unchanged

Only the detection algorithm has changed - all other features work as before.
