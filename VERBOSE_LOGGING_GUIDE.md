# Verbose Logging Guide

## Overview

Verbose logging has been added to the YouTube API search functionality to help diagnose issues with live stream discovery. This feature provides detailed visibility into:

- API request parameters
- API response data
- Video filtering decisions
- Live stream detection logic

## Usage

### Command Line

Add the `--verbose` or `-v` flag to any collection command:

```bash
# Verbose mode
node src/scripts/collectLiveStreamMetrics.js --start-date 2025-10-24 --end-date 2025-10-31 --verbose

# Using npm script
npm run collect-metrics -- --start-date 2025-10-24 --end-date 2025-10-31 --verbose

# Short form
npm run collect-metrics -- -s 2025-10-24 -e 2025-10-31 -v

# Combine with dry run
npm run collect-metrics -- --start-date 2025-10-24 --end-date 2025-10-31 --verbose --dry-run
```

### Test Script

A dedicated test script is available for debugging:

```bash
node test_verbose_search.js
```

This test script:
- Uses hardcoded test parameters (@ciidb channel, Aug-Nov 2025)
- Shows all API interactions
- Analyzes results to identify live streams vs regular videos
- Reports API quota usage

## What Gets Logged

### 1. Search Request Details

```
🔍 YouTube API Search Request:
   Channel ID: UCpSY1H_KhuPJOvS6CJqgiQQ
   Date Range: 2025-08-01T00:00:00.000Z to 2025-11-01T23:59:59.999Z
   Max Results per page: 50
   Order: date
```

### 2. API Call Parameters

```
📡 API Call (Page 1):
   Parameters: {
     "part": ["snippet"],
     "channelId": "UCpSY1H_KhuPJOvS6CJqgiQQ",
     "type": ["video"],
     "publishedAfter": "2025-08-01T00:00:00.000Z",
     "publishedBefore": "2025-11-01T23:59:59.999Z",
     "maxResults": 50,
     "order": "date"
   }
```

### 3. API Response Summary

```
📥 API Response (Page 1):
   Total Results: 25
   Results in this page: 25
   Next Page Token: none

   Videos found in this page:
     1. abc123xyz - "Live Stream Title"
        Published: 2025-10-24T18:00:00Z
        Description: This is a live stream...
     2. def456uvw - "Another Video"
        Published: 2025-10-23T14:30:00Z
        Description: Regular upload...
```

### 4. Video Statistics Details

```
📊 Fetching video statistics for 25 video(s)...

📡 Videos API Call (Chunk 1):
   Video IDs: abc123xyz, def456uvw, ghi789rst

📥 Video Statistics Response:
   Videos returned: 3

   Video 1: abc123xyz
      Title: "Live Stream Title"
      Published: 2025-10-24T18:00:00Z
      Live Broadcast Content: none
      View Count: 1500
      Has liveStreamingDetails: true
      Scheduled Start: 2025-10-24T18:00:00Z
      Actual Start: 2025-10-24T18:05:23Z
      Actual End: 2025-10-24T20:15:45Z

   Video 2: def456uvw
      Title: "Regular Upload"
      Published: 2025-10-23T14:30:00Z
      Live Broadcast Content: none
      View Count: 850
      Has liveStreamingDetails: false
```

### 5. Filtering Process

```
📊 Filtering and grouping videos...
   Using MAX (peak) aggregation for view counts (not SUM)

✓ Found video: abc123xyz
  Title: "Live Stream Title"
  Published: 2025-10-24T18:00:00Z
  Views: 1500
  Type: none
  URL: https://www.youtube.com/watch?v=abc123xyz

⏭️  Skipping regular video (not a livestream): def456uvw - "Regular Upload"
```

### 6. Skipped Videos Summary

```
⏭️  SKIPPED VIDEOS: 10 video(s) excluded:
   - def456uvw: "Regular Upload" (not a livestream)
   - xyz789abc: "Tutorial Video" (not a livestream)
   - upcoming123: "Scheduled Stream" (upcoming)
```

### 7. API Errors (if any)

```
❌ API Error:
   Error type: YouTubeApiError
   Message: Quota exceeded
   Status: 403
   Response: {
     "error": {
       "code": 403,
       "message": "The request cannot be completed because you have exceeded your quota.",
       "errors": [
         {
           "message": "The request cannot be completed because you have exceeded your quota.",
           "domain": "youtube.quota",
           "reason": "quotaExceeded"
         }
       ]
     }
   }
```

## Understanding the Output

### Live Stream Detection

A video is considered a live stream if:
1. It has `liveStreamingDetails` object present, OR
2. Its `liveBroadcastContent` is 'live' or 'completed'

Videos are skipped if:
1. `liveBroadcastContent` is 'upcoming' (scheduled but not started)
2. `liveBroadcastContent` is 'none' AND no `liveStreamingDetails` (regular upload)

### Key Fields

- **liveBroadcastContent**: Can be 'none', 'upcoming', 'live', or 'completed'
  - 'none': Regular video or past broadcast (check liveStreamingDetails)
  - 'upcoming': Scheduled but not yet started
  - 'live': Currently streaming
  - 'completed': Recently completed (may not persist long-term)

- **liveStreamingDetails**: Object present only on videos that were/are broadcasts
  - Contains scheduledStartTime, actualStartTime, actualEndTime
  - Most reliable indicator of a live stream

### Aggregation Method

The system uses **MAX (peak) aggregation**, not SUM:
- For multiple streams on the same day, records the highest view count
- This reflects the most successful stream of the day
- Avoids inflating metrics by summing multiple streams

## Troubleshooting

### No Results Found

If verbose mode shows videos found but none accepted:

1. **Check liveStreamingDetails:**
   ```
   Has liveStreamingDetails: false
   ```
   This indicates it's not a live stream.

2. **Check liveBroadcastContent:**
   ```
   Live Broadcast Content: none
   ```
   Combined with no liveStreamingDetails = regular video.

3. **Check if upcoming:**
   ```
   Live Broadcast Content: upcoming
   ```
   These are intentionally skipped (not yet streamed).

### API Quota Issues

Monitor the quota usage reported at the end:
```
API Quota Usage:
  Used: 300 / 10000
  Remaining: 9700
```

Each search call costs 100 units, each videos.list costs 1 unit.

### Date Range Issues

Verify the date range being searched:
```
Date Range: 2025-08-01T00:00:00.000Z to 2025-11-01T23:59:59.999Z
```

Make sure:
- Dates are in the past (can't find future streams)
- Range isn't too large (quota limits)
- Timezone is correct (times are in UTC)

## Performance Considerations

### API Quota Usage

Verbose logging doesn't increase API usage—it only shows what's already happening:
- Search: 100 units per page
- Videos.list: 1 unit per call (50 videos max)

### Output Volume

Verbose mode produces significant output. Use it for:
- Initial setup and testing
- Debugging issues
- Verifying configuration

For production/scheduled runs, omit `--verbose` for cleaner logs.

## Example Session

```bash
# Test with a small date range first
npm run collect-metrics -- --start-date 2025-10-24 --end-date 2025-10-24 --verbose

# If results look good, expand the range
npm run collect-metrics -- --start-date 2025-10-01 --end-date 2025-10-31 --verbose

# For production, remove verbose flag
npm run collect-metrics -- --start-date 2025-10-01 --end-date 2025-10-31
```

## Additional Resources

- **YOUTUBE_SEARCH_FIX.md** - Details on the search parameter fix
- **DEBUG_GUIDE.md** - General debugging guide
- **API.md** - YouTube API usage documentation
- **COLLECTION_SERVICE.md** - Collection service overview
