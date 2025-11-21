# Anomaly Detection - Quick Start Guide

This guide will get you started with the anomaly detection feature in 5 minutes.

## What It Does

Automatically detects and excludes days where view counts spike by more than 1000% (10x) compared to the previous day. This prevents extreme outliers from skewing your analytics and VSI calculations.

## Quick Start

### 1. Preview Anomalies (Dry Run)

See what would be detected without making changes:

```bash
npm run detect-anomalies:dry-run
```

### 2. Run Detection

Detect and automatically exclude anomalies:

```bash
npm run detect-anomalies
```

### 3. List Excluded Days

View all auto-excluded anomalies:

```bash
node src/scripts/detectAnomalies.js --list-excluded
```

### 4. Restore If Needed

If you excluded something by mistake:

```bash
npm run restore-anomalies
```

## Common Use Cases

### Detect for Specific Channel

```bash
node src/scripts/detectAnomalies.js --channel @yourchannelhandle
```

### Custom Threshold

For 500% increase (6x) threshold instead of 1000% (10x):

```bash
node src/scripts/detectAnomalies.js --threshold 6 --dry-run
```

Threshold calculation: `threshold = multiplier`
- 5x (400% increase): threshold = 5.0
- 10x (900% increase): threshold = 10.0 (default)
- 15x (1400% increase): threshold = 15.0

### Detect for Date Range

```bash
node src/scripts/detectAnomalies.js \
  --start-date 2024-01-01 \
  --end-date 2024-12-31 \
  --dry-run
```

## Configuration

Set these in your `.env` file:

```env
# Spike threshold (10.0 = 1000% increase or 10x)
ANOMALY_SPIKE_THRESHOLD=10.0

# Days to look back for previous non-excluded day
ANOMALY_LOOKBACK_DAYS=7
```

## Understanding the Output

When you run detection, you'll see output like:

```
[AnomalyDetector] Auto-excluded: @channelname on 2024-01-15 - 25000 views (1036.4% increase from 2200 on 2024-01-14, ratio: 11.36x)
```

This means:
- Channel: @channelname
- Date: 2024-01-15
- Views: 25,000
- Increase: 1,036.4% from previous day
- Previous Day: 2024-01-14 with 2,200 views
- Ratio: 11.36x (exceeded 10x threshold)

## How It Works

1. **Find Previous Day**: Looks for the immediately previous non-excluded day
2. **Spike Detection**: Compares current day views to previous day views
3. **Auto-Exclusion**: If ratio > threshold (default 10x), marks day as excluded
4. **VSI Update**: Excluded days are automatically filtered from VSI calculations

## REST API Usage

### Detect via API

```bash
curl -X POST http://localhost:3000/api/anomalies/detect \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'
```

### Get Configuration

```bash
curl http://localhost:3000/api/anomalies/config
```

### List Excluded

```bash
curl http://localhost:3000/api/metrics/excluded?auto_only=true
```

## Workflow Recommendation

1. **Initial Setup**: Run dry-run to see what would be detected
   ```bash
   npm run detect-anomalies:dry-run
   ```

2. **Review Results**: Check if the detections make sense

3. **Adjust Threshold** (if needed): Lower threshold catches more, higher catches less
   ```bash
   node src/scripts/detectAnomalies.js --threshold 15 --dry-run
   ```

4. **Run Detection**: When satisfied, run for real
   ```bash
   npm run detect-anomalies
   ```

5. **Regular Maintenance**: Run weekly/monthly on new data
   ```bash
   node src/scripts/detectAnomalies.js --start-date 2024-12-01 --end-date 2024-12-31
   ```

## Troubleshooting

### "No active channels found"
Make sure you have channels added:
```bash
npm run manage-channels list
```

### "No anomalies detected"
Either:
- Your data doesn't have day-to-day spikes > 10x (1000%)
- Not enough consecutive data (need at least 2 days)
- Threshold is too high

Try lower threshold:
```bash
node src/scripts/detectAnomalies.js --threshold 6 --dry-run
```

### "Too many false positives"
Increase threshold:
```bash
node src/scripts/detectAnomalies.js --threshold 15 --dry-run
```

## Next Steps

- Read full documentation: [ANOMALY_DETECTION.md](./ANOMALY_DETECTION.md)
- Understand the API: See REST API section in README.md
- Automate detection: Set up cron job to run weekly

## Need Help?

Run the help command:
```bash
node src/scripts/detectAnomalies.js --help
```

Or check the comprehensive documentation in `ANOMALY_DETECTION.md`.
