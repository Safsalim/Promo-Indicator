# Anomaly Detection - Quick Start Guide

This guide will get you started with the anomaly detection feature in 5 minutes.

## What It Does

Automatically detects and excludes days where view counts spike by more than 1000% compared to recent averages. This prevents extreme outliers from skewing your analytics and VSI calculations.

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

For 500% spike threshold instead of 1000%:

```bash
node src/scripts/detectAnomalies.js --threshold 6 --dry-run
```

Threshold calculation: `threshold = (percentage / 100) + 1`
- 500%: threshold = 6.0
- 1000%: threshold = 11.0 (default)
- 2000%: threshold = 21.0

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
# Spike threshold (11.0 = 1000% spike)
ANOMALY_SPIKE_THRESHOLD=11.0

# Days for baseline calculation
ANOMALY_BASELINE_DAYS=7

# Minimum days required for baseline
ANOMALY_MIN_BASELINE_DAYS=3
```

## Understanding the Output

When you run detection, you'll see output like:

```
[AnomalyDetector] Auto-excluded: @channelname on 2024-01-15 - 25000 views (1100.5% spike, baseline: 2200)
```

This means:
- Channel: @channelname
- Date: 2024-01-15
- Views: 25,000
- Spike: 1,100.5% (11x the baseline)
- Baseline: 2,200 views (7-day average)

## How It Works

1. **Baseline Calculation**: Uses 7-day moving average of previous days
2. **Spike Detection**: Compares current day to baseline
3. **Auto-Exclusion**: If spike > threshold, marks day as excluded
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
- Your data doesn't have spikes > 1000%
- Not enough baseline data (need 3+ days)
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
