# Peak Views Migration Guide

## Overview

This migration changes the live stream metrics aggregation from **sum of all views** to **peak (maximum) view count** per day. This provides better sentiment analysis by focusing on the highest engagement rather than inflating numbers on days with multiple streams.

## What Changed

### Database Schema
- Field renamed: `total_live_stream_views` → `peak_live_stream_views`
- New field added: `peak_video_id` (tracks which video had the peak views)
- Both fields added to the `live_stream_metrics` table

### Aggregation Logic
**Before:**
```javascript
// Sum all views from all streams on the same day
const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
// Aug 28: Stream A (255 views) + Stream B (285 views) = 540 views
```

**After:**
```javascript
// Use maximum view count from all streams on the same day
const peakViews = Math.max(...videos.map(v => v.viewCount));
// Aug 28: Max(255, 285) = 285 views
```

### Impact on Existing Data
- Days with **single streams**: No change in values
- Days with **multiple streams**: Will show only the peak stream's views
- **Example**: Aug 28 changes from 540 views (sum) → 285 views (peak)

## Migration Steps

### 1. Run the Migration Script

**IMPORTANT:** Back up your database first!

```bash
# Backup your database
cp database/promo-indicator.db database/promo-indicator.db.backup

# Run the migration
node src/scripts/migrateToPeakViews.js
```

This script will:
- Rename `total_live_stream_views` to `peak_live_stream_views`
- Add the `peak_video_id` column
- Preserve existing data (but values will be the old summed values)

### 2. Re-collect Historical Data

To get accurate peak values instead of summed values, re-run the data collection:

```bash
# Re-collect for a specific date range
node src/scripts/collectLiveStreamMetrics.js --start-date 2024-08-01 --end-date 2024-08-31

# Or re-collect all historical data
node src/scripts/collectLiveStreamMetrics.js --start-date 2024-01-01 --end-date 2024-12-31
```

### 3. Verify the Changes

```bash
# Test the models to verify everything works
node src/scripts/testModels.js

# Check a specific date to see the new values
node src/scripts/collectLiveStreamMetrics.js --start-date 2024-08-28 --end-date 2024-08-28 --verbose
```

## UI Changes

### Updated Labels
- "Total Views" → "Total Peak Views" (sum of daily peaks)
- "Average Daily Views" → "Avg Daily Peak Views"
- Chart tooltips now show "peak views" and indicate when multiple streams occurred

### Enhanced Tooltips
When hovering over days with multiple streams:
```
Peak: 285 views
(2 streams on this day)
```

### Summary Stats Explanation
- **Total Peak Views**: Sum of the peak view counts from all days
- **Avg Daily Peak Views**: Average of the peak view counts
- All metrics now represent peak engagement per day

## API Changes

### Response Field Names
All API responses now use `peak_live_stream_views` instead of `total_live_stream_views`:

```json
{
  "date": "2024-08-28",
  "peak_live_stream_views": 285,
  "live_stream_count": 2,
  "peak_video_id": "abc123xyz"
}
```

### Summary Statistics
The `/api/metrics/summary` endpoint now returns:
```json
{
  "total_views": 12850,     // Sum of all peak values
  "avg_views": 257,          // Average of peak values
  "max_views": 500           // Highest peak
}
```

## Technical Details

### Files Modified
1. **Data Collection**:
   - `src/services/liveStreamCollector.js` - Changed aggregation logic
   
2. **Database**:
   - `src/models/schema.js` - Updated schema
   - `src/models/LiveStreamMetrics.js` - Updated queries
   - `src/config/database.js` - Updated schema initialization
   
3. **API**:
   - `src/routes/dashboard.js` - Updated all queries
   - `src/utils/indicators.js` - Updated RSI calculations
   
4. **Frontend**:
   - `frontend/public/app.js` - Updated field references and tooltips
   - `frontend/public/index.html` - Updated labels
   - `frontend/public/styles.css` - Added new styles

5. **Tests & Scripts**:
   - `src/tests/dashboardApi.test.js` - Updated test data
   - `src/scripts/seedChannels.js` - Updated field names
   - `src/scripts/testModels.js` - Updated output messages

## Rollback

If you need to rollback:

1. Restore your database backup:
```bash
cp database/promo-indicator.db.backup database/promo-indicator.db
```

2. Revert to the previous commit:
```bash
git revert <commit-hash>
```

## Benefits

### Better Sentiment Analysis
- **More accurate**: Peak views represent true engagement level
- **Not inflated**: Days with multiple streams don't get artificially boosted
- **Consistent**: Easier to compare days regardless of stream count

### Clearer Metrics
- RSI calculations now reflect actual sentiment peaks
- Trend analysis shows real engagement changes
- Charts are more meaningful for decision-making

## Questions?

See the original ticket for more context and examples.
