# Testing Video Deduplication and Audit Trail

## Test Setup

This document describes how to test the new video deduplication and audit trail features.

## Features Implemented

### 1. Video Deduplication
- **Location**: `src/services/liveStreamCollector.js` - `groupStreamsByDate()` method
- **Implementation**: Uses a `Set` to track seen video IDs and prevents counting the same video multiple times
- **Logging**: Warns when duplicates are detected with video details

### 2. Enhanced Filtering
- **Location**: `src/services/youtubeApiClient.js` - `searchLiveStreams()` method
- **Implementation**: 
  - Added `videoDuration: 'medium'` filter to exclude shorts
  - Filters out upcoming livestreams in groupStreamsByDate
- **Logging**: Logs when upcoming videos are skipped

### 3. Video Audit Trail
- **Database Table**: `live_stream_videos`
- **Model**: `src/models/LiveStreamVideo.js`
- **Storage**: Each video counted is stored with:
  - video_id
  - channel_id
  - date
  - title
  - url
  - view_count
  - published_at
  - broadcast_type

### 4. Enhanced Logging
Each video being counted now logs:
- Video ID
- Title
- Published date
- View count
- URL
- Broadcast type

### 5. Validation API Endpoint
- **Endpoint**: `GET /api/metrics/:date/videos`
- **Query Parameters**: `?channel_ids=1,2,3` (optional)
- **Returns**:
  - Summary of videos counted for the date
  - Full list of videos with details
  - Breakdown by channel

## Testing the Implementation

### Test 1: Run Collection with Enhanced Logging

```bash
# Set up your YouTube API key in .env
echo "YOUTUBE_API_KEY=your_key_here" >> .env

# Run metrics collection for a specific date
# (Replace with your actual channel and date)
curl -X POST http://localhost:3000/api/collect-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-08-28",
    "end_date": "2024-08-28",
    "channel_ids": [1]
  }'
```

### Test 2: Verify Video Audit Trail

```bash
# Get videos counted for a specific date
curl http://localhost:3000/api/metrics/2024-08-28/videos
```

Expected response:
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
    "videos": [
      {
        "video_id": "abc123",
        "channel_id": 1,
        "channel_handle": "@ciidb",
        "channel_name": "Channel Name",
        "title": "Live Stream Title",
        "url": "https://www.youtube.com/watch?v=abc123",
        "view_count": 255,
        "published_at": "2024-08-28T10:00:00Z",
        "broadcast_type": "none"
      }
    ],
    "by_channel": [...]
  }
}
```

### Test 3: Verify Deduplication

If the YouTube API returns duplicate video IDs, you should see warnings in the logs:

```
🔁 DUPLICATE DETECTED: Video abc123 - "Video Title" already counted for 2024-08-28

⚠️  DUPLICATE SUMMARY: 1 duplicate(s) detected and excluded:
   - abc123: "Video Title" (255 views)
```

### Test 4: Compare with YouTube

1. Get the video URL from the API response
2. Visit the YouTube video page
3. Compare the view count (should be within ±5% for API lag)

## Expected Outcomes

1. **No Duplicates**: Each video is counted exactly once per date
2. **Accurate Counts**: View counts match YouTube reality (±5%)
3. **Audit Trail**: All videos are stored in `live_stream_videos` table
4. **Enhanced Logging**: Detailed logs show exactly what's being counted
5. **Validation**: Users can query which videos contributed to each date's metrics

## Database Verification

```bash
# Install sqlite3 if not already installed
sqlite3 database/promo-indicator.db

# Query the videos table
SELECT 
  lsv.date,
  lsv.video_id,
  lsv.title,
  lsv.view_count,
  c.channel_handle
FROM live_stream_videos lsv
JOIN channels c ON lsv.channel_id = c.id
WHERE lsv.date = '2024-08-28'
ORDER BY lsv.view_count DESC;
```

## Fixes Implemented

### Issue 1: Duplicate Counting
- ✅ Added Set-based deduplication
- ✅ Logs duplicate detection

### Issue 2: Wrong Video Selection
- ✅ Filter out upcoming livestreams
- ✅ Added videoDuration filter to exclude shorts
- ✅ Only counts completed/live events

### Issue 3: No Audit Trail
- ✅ Created live_stream_videos table
- ✅ Stores each video with full details
- ✅ API endpoint to retrieve videos per date

### Issue 4: Insufficient Logging
- ✅ Logs each video being counted with full details
- ✅ Logs duplicate detection
- ✅ Logs skipped videos (upcoming)

### Issue 5: No Validation
- ✅ Created GET /api/metrics/:date/videos endpoint
- ✅ Shows which videos contributed to metrics
- ✅ Grouped by channel for easy verification
