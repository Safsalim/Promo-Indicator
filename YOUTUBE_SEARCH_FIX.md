# YouTube API Search Fix - Live Stream Discovery

## Problem

The YouTube API search was not finding any live streams for channel @ciidb (UCpSY1H_KhuPJOvS6CJqgiQQ) even though the channel had multiple live streams in the Aug-Nov 2025 range. The API quota was being consumed (300 points), indicating the API was being called, but no results were returned.

## Root Cause

The issue was with the search parameters being passed to the YouTube API:

1. **`eventType: 'completed'` parameter was too restrictive**
   - The `eventType` parameter only works for broadcasts that are currently in that specific state
   - For historical/past live streams, this parameter filters out most results
   - Past broadcasts may not be marked as "completed" in YouTube's system

2. **`videoDuration: 'medium'` parameter was filtering out results**
   - This parameter restricted results to videos of medium length
   - Many live streams can be very long or very short
   - This unnecessarily limited the search results

3. **Lack of verbose logging**
   - There was no way to see what the API was actually returning
   - No visibility into the search parameters being sent
   - Difficult to debug why searches were failing

## Solution

### 1. Removed Restrictive Search Parameters

**Before:**
```javascript
const response = await youtube.search.list({
  part: ['snippet'],
  channelId: channelId,
  eventType: eventType,           // ❌ Removed - too restrictive
  type: ['video'],
  videoDuration: videoDuration,   // ❌ Removed - too restrictive
  publishedAfter: startDateTime.toISOString(),
  publishedBefore: endDateTime.toISOString(),
  maxResults: maxResults,
  pageToken: pageToken,
  order: order
});
```

**After:**
```javascript
const response = await youtube.search.list({
  part: ['snippet'],
  channelId: channelId,
  type: ['video'],               // ✅ Search all videos
  publishedAfter: startDateTime.toISOString(),
  publishedBefore: endDateTime.toISOString(),
  maxResults: maxResults,
  pageToken: pageToken,
  order: order
});
```

The new approach:
- Searches for **all videos** in the date range
- Filters for live streams after fetching video statistics
- Uses `liveStreamingDetails` presence as the indicator

### 2. Improved Filtering Logic

Updated `groupStreamsByDate()` to better identify live streams:

```javascript
const hasLiveStreamingDetails = !!stats.liveStreamingDetails;

// Skip upcoming streams
if (broadcastContent === 'upcoming') {
  return;
}

// Skip regular videos (not live streams)
if (!hasLiveStreamingDetails && broadcastContent === 'none') {
  return;
}

// Accept: videos with liveStreamingDetails OR broadcastContent !== 'none'
```

This approach accepts:
- Videos with `liveStreamingDetails` object (definite live streams)
- Videos with `liveBroadcastContent` of 'live' or 'completed'
- Past broadcasts that still have streaming details

### 3. Added Comprehensive Verbose Logging

#### YouTube API Client Logging

Added verbose mode to `YouTubeApiClient`:
- Shows exact search parameters being sent
- Displays API response metadata (total results, page count)
- Lists all videos found in each page
- Shows video statistics details including:
  - `liveBroadcastContent` status
  - `liveStreamingDetails` presence
  - Scheduled/actual start/end times
  - View counts

#### Collection Service Logging

Enhanced logging in `liveStreamCollector`:
- Shows filtering process
- Lists skipped videos with reasons
- Displays which videos are accepted as live streams
- Reports aggregation method (MAX/PEAK views)

### 4. Usage

Enable verbose logging with the `--verbose` or `-v` flag:

```bash
# Test with verbose logging
node src/scripts/collectLiveStreamMetrics.js --start-date 2025-10-24 --end-date 2025-10-31 --verbose

# Or use npm script
npm run collect-metrics -- --start-date 2025-10-24 --end-date 2025-10-31 --verbose
```

Example verbose output:
```
🔍 YouTube API Search Request:
   Channel ID: UCpSY1H_KhuPJOvS6CJqgiQQ
   Date Range: 2025-08-01T00:00:00.000Z to 2025-11-01T23:59:59.999Z
   Max Results per page: 50
   Order: date

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

📥 API Response (Page 1):
   Total Results: 25
   Results in this page: 25
   Next Page Token: none

   Videos found in this page:
     1. abc123xyz - "Live Stream Title"
        Published: 2025-10-24T18:00:00Z
        Description: Stream description...

📊 Fetching video statistics for 25 video(s)...

📥 Video Statistics Response:
   Videos returned: 25

   Video 1: abc123xyz
      Title: "Live Stream Title"
      Published: 2025-10-24T18:00:00Z
      Live Broadcast Content: none
      View Count: 1500
      Has liveStreamingDetails: true
      Scheduled Start: 2025-10-24T18:00:00Z
      Actual Start: 2025-10-24T18:05:23Z
      Actual End: 2025-10-24T20:15:45Z

📊 Filtering and grouping videos...
   Using MAX (peak) aggregation for view counts (not SUM)

✓ Found video: abc123xyz
  Title: "Live Stream Title"
  Published: 2025-10-24T18:00:00Z
  Views: 1500
  Type: none
  URL: https://www.youtube.com/watch?v=abc123xyz

⏭️  SKIPPED VIDEOS: 10 video(s) excluded:
   - xyz789abc: "Regular Upload Video" (not a livestream)
```

## Testing

### Test Script

Created `test_verbose_search.js` to test the search functionality:

```bash
node test_verbose_search.js
```

This script:
1. Tests the search with verbose logging enabled
2. Shows all API requests and responses
3. Analyzes the results to count live streams vs regular videos
4. Reports quota usage

### Manual Testing

1. **Add test channel:**
   ```bash
   npm run manage-channels add @ciidb
   ```

2. **Run collection with verbose logging:**
   ```bash
   npm run collect-metrics -- --start-date 2025-08-01 --end-date 2025-11-01 --verbose
   ```

3. **Verify results in dashboard:**
   - Start the server: `npm start`
   - Open dashboard: `http://localhost:3000`
   - Check that metrics appear for @ciidb

## API Quota Impact

The new approach uses the same quota as before:
- Search API: 100 units per call
- Videos.list API: 1 unit per call

By removing the restrictive filters, we may get more results but we properly filter them in the application layer.

## Benefits

1. **More Reliable**: Finds all live streams, not just those marked "completed"
2. **Better Debugging**: Verbose logging helps diagnose issues
3. **Flexible**: Works with various live stream states and durations
4. **Accurate Filtering**: Uses `liveStreamingDetails` as the definitive indicator
5. **Transparent**: Clear visibility into what's happening at each step

## Files Modified

1. `src/services/youtubeApiClient.js`
   - Added `verbose` property and `setVerbose()` method
   - Removed `eventType` and `videoDuration` from search parameters
   - Added comprehensive logging throughout search and statistics methods

2. `src/services/liveStreamCollector.js`
   - Updated to pass verbose flag to YouTube API client
   - Improved filtering logic in `groupStreamsByDate()`
   - Added skipped videos tracking and reporting

3. `src/scripts/collectLiveStreamMetrics.js`
   - Already had `--verbose` flag support
   - Now properly activates new verbose logging

## Future Improvements

1. Consider adding command-line option to control search approach:
   - Strict mode (with eventType filter)
   - Broad mode (current implementation)

2. Add more granular logging levels:
   - `--verbose` - Current implementation
   - `--debug` - Even more detailed API responses
   - `--quiet` - Minimal output

3. Add caching layer to reduce API calls for recently searched channels

4. Implement automatic retry with different search parameters if no results found
