# Fix Summary: Duplicate/Incorrect View Count Aggregation

## Problem Statement
View counts were significantly higher than actual YouTube values. For @ciidb on Aug 28, the dashboard showed 540 views but the actual YouTube live stream showed 255 views.

## Root Causes Identified
1. **Duplicate counting**: Same video could be counted multiple times if YouTube API returned it in multiple search results
2. **No audit trail**: No way to verify which videos contributed to metrics
3. **Insufficient filtering**: Not filtering out shorts or upcoming livestreams properly
4. **Poor logging**: No visibility into what was being counted

## Solutions Implemented

### 1. Video Deduplication (Critical Fix)
**File**: `src/services/liveStreamCollector.js`

**Changes**:
- Added `Set` to track seen video IDs: `const seenVideoIds = new Set()`
- Check each video ID before counting: `if (seenVideoIds.has(globalVideoKey)) { ... }`
- Log duplicate detections with video details
- Display duplicate summary at the end

**Impact**: Ensures each video is counted exactly once per collection run

### 2. Video Audit Trail (New Feature)
**Files**: 
- `src/models/schema.js` - Added `live_stream_videos` table
- `src/models/LiveStreamVideo.js` - New model (created)
- `src/services/liveStreamCollector.js` - Stores video details during collection

**Schema**:
```sql
CREATE TABLE live_stream_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL,
  channel_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  title TEXT,
  url TEXT,
  view_count INTEGER DEFAULT 0,
  published_at DATETIME,
  broadcast_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(video_id, channel_id, date)
);
```

**Impact**: 
- Full audit trail of which videos contributed to each date
- Ability to verify data accuracy
- Historical record for troubleshooting

### 3. Enhanced Logging (Debugging Feature)
**File**: `src/services/liveStreamCollector.js`

**Changes**:
- Log each video being counted with:
  - Video ID
  - Title
  - Published date
  - View count
  - URL
  - Broadcast type
- Log when duplicates are detected
- Log when videos are skipped (e.g., upcoming streams)
- Log duplicate summary

**Example Output**:
```
✓ Counting video: abc123
  Title: "Live Stream Title"
  Published: 2024-08-28T10:00:00Z
  Views: 255
  URL: https://www.youtube.com/watch?v=abc123
  Broadcast Type: none

🔁 DUPLICATE DETECTED: Video xyz789 - "Title" already counted for 2024-08-28
```

**Impact**: Full visibility into what's being counted and why

### 4. Improved Filtering
**File**: `src/services/youtubeApiClient.js`

**Changes**:
- Added `videoDuration: 'medium'` filter to exclude shorts
- Filter out `liveBroadcastContent: 'upcoming'` videos in post-processing

**File**: `src/services/liveStreamCollector.js`

**Changes**:
- Skip upcoming livestreams with logging
- Removed incorrect livestream validation logic

**Impact**: Only counts actual completed/live livestreams, excludes shorts and upcoming events

### 5. Validation API Endpoint (New Feature)
**File**: `src/routes/dashboard.js`

**New Endpoint**: `GET /api/metrics/:date/videos`

**Query Parameters**: 
- `channel_ids` (optional): Filter by specific channels

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "date": "2024-08-28",
      "total_videos": 1,
      "total_views": 255,
      "channels": 1
    },
    "videos": [...],
    "by_channel": [...]
  }
}
```

**Impact**: 
- Users can verify which videos were counted
- Easy comparison with YouTube reality
- Debug data accuracy issues

### 6. Migration Script
**File**: `src/scripts/migrateLiveStreamVideos.js` (created)

**Purpose**: Creates the `live_stream_videos` table and indexes

**Usage**: `node src/scripts/migrateLiveStreamVideos.js`

## Files Modified

### Modified Files
1. `src/models/schema.js` - Added live_stream_videos table
2. `src/services/liveStreamCollector.js` - Added deduplication, logging, and video storage
3. `src/services/youtubeApiClient.js` - Improved filtering
4. `src/routes/dashboard.js` - Added validation endpoint

### New Files
1. `src/models/LiveStreamVideo.js` - Model for video audit trail
2. `src/scripts/migrateLiveStreamVideos.js` - Migration script
3. `test_deduplication.md` - Testing guide
4. `DEDUPLICATION_FIX_SUMMARY.md` - This file

## Testing Instructions

### 1. Run Migration
```bash
node src/scripts/migrateLiveStreamVideos.js
```

### 2. Collect Metrics with Enhanced Logging
```bash
curl -X POST http://localhost:3000/api/collect-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-08-28",
    "end_date": "2024-08-28",
    "channel_ids": [1]
  }'
```

Watch the logs for:
- Detailed video counting logs
- Duplicate detection warnings
- Skipped video logs

### 3. Verify Video Audit Trail
```bash
curl http://localhost:3000/api/metrics/2024-08-28/videos
```

### 4. Compare with YouTube
1. Get video URL from API response
2. Visit YouTube video page
3. Compare view counts (should match within ±5%)

## Expected Results

1. **Accurate View Counts**: Should match YouTube reality (±5% for API lag)
2. **No Duplicates**: Each video counted exactly once
3. **Full Visibility**: Detailed logs show what's being counted
4. **Audit Trail**: Can verify which videos contributed to metrics
5. **Better Filtering**: Only actual livestreams counted, no shorts or upcoming

## Rollback Plan

If issues occur:

1. **Remove audit trail** (data collection still works without it):
```sql
DROP TABLE live_stream_videos;
```

2. **Revert files** using git:
```bash
git checkout HEAD~1 -- src/services/liveStreamCollector.js
git checkout HEAD~1 -- src/services/youtubeApiClient.js
git checkout HEAD~1 -- src/routes/dashboard.js
```

## Future Enhancements

1. **Dashboard UI**: Add video drill-down view in frontend
2. **Comparison Tool**: Automated YouTube comparison and alerts
3. **Historical Tracking**: Track view count changes over time
4. **Advanced Filters**: Filter by broadcast type, duration, etc.
5. **Batch Validation**: Validate multiple dates at once

## Performance Considerations

- **Database Size**: Each video adds one row to `live_stream_videos` table
  - Estimate: ~100 bytes per video record
  - 1000 videos = ~100KB
  - Indexes add minimal overhead
  
- **API Calls**: No additional YouTube API calls needed
  - All data collected during existing API calls
  
- **Query Performance**: Indexes on (channel_id, date) and video_id ensure fast queries

## Maintenance Notes

1. **Data Retention**: Consider adding cleanup script for old video records
2. **Monitoring**: Watch for duplicate detection logs - high frequency indicates API issues
3. **Validation**: Periodically compare dashboard metrics with YouTube reality
4. **Logging**: Comprehensive logs help diagnose issues quickly
