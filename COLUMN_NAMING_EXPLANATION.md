# Database Column Naming: total_live_stream_views

## Why "total" instead of "peak"?

The database column is named `total_live_stream_views` but semantically represents **peak (maximum) views** per day, not summed views. This naming decision was made to:

1. **Avoid Database Migrations**: Existing databases can continue to work without requiring schema changes
2. **Backward Compatibility**: Reduces breaking changes for deployed installations
3. **Simplify Deployment**: No migration scripts needed during updates

## The Important Change: Aggregation Logic

The key change was in the **collection logic**, not the column name:

### Before:
```javascript
// Sum all views from multiple streams on the same day
const totalViews = videos.reduce((sum, v) => sum + v.viewCount, 0);
// Example: Stream A (255) + Stream B (285) = 540 views
```

### After:
```javascript
// Use maximum view count from all streams on the same day
const peakViews = Math.max(...videos.map(v => v.viewCount));
// Example: Max(255, 285) = 285 views
```

## Implementation Details

- **File**: `src/services/liveStreamCollector.js` (lines 127-132)
- **Logic**: When multiple streams exist for one date, store the MAX view count
- **Tracking**: `peak_video_id` column tracks which video had the peak views

## In Code References

- **Database column name**: `total_live_stream_views`
- **Variable names**: `peakViews`, `data.peakViews` (descriptive business logic names)
- **Model methods**: Accept `total_live_stream_views` as parameter
- **SQL queries**: Reference `total_live_stream_views` column

## Benefits

1. **Better Metrics**: Peak views represent true engagement level, not inflated sums
2. **Fair Comparison**: Days with single vs. multiple streams are now comparable
3. **Accurate RSI**: Sentiment indicators use actual peak engagement, not artificial totals

## UI/Documentation

Front-end labels and API documentation can refer to this metric as "peak views" or "maximum daily views" - the column name is an internal implementation detail.
