# Test Verbose Search Script

## Purpose

`test_verbose_search.js` is a standalone test script that demonstrates and verifies the verbose logging functionality for YouTube API live stream searches.

## What It Tests

- YouTube API search with verbose logging enabled
- Search parameters and API request format
- API response parsing
- Video statistics fetching
- Live stream detection logic
- Quota usage tracking

## Usage

### Prerequisites

1. Node.js installed
2. Dependencies installed (`npm install`)
3. `.env` file with valid `YOUTUBE_API_KEY`

### Run the Test

```bash
# Method 1: Direct execution
node test_verbose_search.js

# Method 2: As executable (after chmod +x)
./test_verbose_search.js
```

### Configuration

The test uses hardcoded parameters for consistency:
- **Channel:** @ciidb (UCpSY1H_KhuPJOvS6CJqgiQQ)
- **Date Range:** Aug 1, 2025 to Nov 1, 2025

To test different parameters, edit the script:

```javascript
const channelId = 'UCpSY1H_KhuPJOvS6CJqgiQQ';  // Change channel ID
const startDate = '2025-08-01';                // Change start date
const endDate = '2025-11-01';                  // Change end date
```

## Expected Output

### Successful Run

```
Testing YouTube API Search with Verbose Logging

============================================================
Test Configuration:
  Channel: @ciidb (UCpSY1H_KhuPJOvS6CJqgiQQ)
  Date Range: 2025-08-01 to 2025-11-01
============================================================

Starting search...

🔍 YouTube API Search Request:
   Channel ID: UCpSY1H_KhuPJOvS6CJqgiQQ
   Date Range: 2025-08-01T00:00:00.000Z to 2025-11-01T23:59:59.999Z
   Max Results per page: 50
   Order: date

📡 API Call (Page 1):
   Parameters: {
     "part": ["snippet"],
     "channelId": "UCpSY1H_KhuPJOvS6CJqgiQQ",
     ...
   }

📥 API Response (Page 1):
   Total Results: 25
   Results in this page: 25
   Next Page Token: none

   Videos found in this page:
     1. abc123xyz - "Stream Title"
        ...

============================================================
FINAL RESULTS:
  Total videos found: 25
============================================================

📊 Fetching video statistics for 25 video(s)...

📥 Video Statistics Response:
   Videos returned: 25
   
   Video 1: abc123xyz
      Title: "Stream Title"
      Live Broadcast Content: none
      Has liveStreamingDetails: true
      ...

============================================================
STATISTICS SUMMARY:
  Videos with stats: 25
  Live streams (with liveStreamingDetails): 15
  Regular videos: 10
============================================================

API Quota Usage:
  Used: 300 / 10000
  Remaining: 9700

✅ Test completed successfully
```

### Error Scenarios

**No API Key:**
```
❌ Error during test:
  Type: YouTubeApiError
  Message: YouTube API key is missing or invalid
  Error Type: AUTH_ERROR
```

**Invalid Channel ID:**
```
❌ Error during test:
  Type: YouTubeApiError
  Message: Channel not found
  Error Type: NOT_FOUND
```

**Quota Exceeded:**
```
❌ Error during test:
  Type: YouTubeApiError
  Message: The request cannot be completed because you have exceeded your quota
  Error Type: QUOTA_EXCEEDED
```

## What to Look For

### Successful Test Indicators

1. ✅ API request parameters are displayed
2. ✅ API response shows videos found
3. ✅ Video statistics include `liveStreamingDetails` field
4. ✅ Live streams are correctly identified
5. ✅ Quota usage is reasonable (search: 100, stats: 1 per call)

### Troubleshooting

**No Videos Found:**
- Check date range is valid (not in future)
- Verify channel has videos in that range
- Check API key permissions

**No Live Streams Detected:**
- Check verbose output for `Has liveStreamingDetails: false`
- Verify the videos found are actually live streams
- Check `Live Broadcast Content` field

**High Quota Usage:**
- Each search page: 100 units
- Each videos.list call: 1 unit
- Multiple pages will consume more quota

## Comparison with Collection Script

This test script is similar to running:

```bash
npm run collect-metrics -- --start-date 2025-08-01 --end-date 2025-11-01 --verbose --dry-run
```

But with these differences:

| Feature | test_verbose_search.js | collectLiveStreamMetrics.js |
|---------|------------------------|------------------------------|
| Database | Not used | Required |
| Channels | Hardcoded | From database |
| Storage | No data saved | Saves to database |
| Focus | API testing | Full collection |
| Output | Analysis summary | Metrics storage |

## Use Cases

1. **Verify API Setup** - Test API key works correctly
2. **Debug Search Issues** - See exact API requests/responses
3. **Understand Filtering** - See which videos are live streams
4. **Check Quota Usage** - Monitor API quota consumption
5. **Test Before Collection** - Verify results before saving to DB

## Integration with Main System

This script uses the same `YouTubeApiClient` as the main collection system, ensuring:
- Same search logic
- Same filtering criteria
- Same error handling
- Same quota tracking

Results from this test will match what the collection script finds.

## Cleanup

The test script:
- Does NOT modify the database
- Does NOT save any data
- Does NOT affect quota beyond the test itself
- Can be run multiple times safely

To stop consuming quota, simply don't run the test.

## Further Reading

- **VERBOSE_LOGGING_GUIDE.md** - Comprehensive guide to verbose mode
- **YOUTUBE_SEARCH_FIX.md** - Technical details of the search fix
- **COLLECTION_SERVICE.md** - Main collection service documentation
