# YouTube API Client - Developer Guide

## Overview

This directory contains the YouTube Data API v3 integration for the Promo-Indicator project.

## Files

### youtubeApiClient.js
The core YouTube API client with comprehensive features:
- Channel handle resolution
- Live stream search and filtering
- Video statistics retrieval
- Error handling and categorization
- Rate limiting and quota tracking
- Automatic retry with exponential backoff

**Key Classes:**
- `YouTubeApiClient` - Main client class
- `YouTubeApiError` - Custom error class

### liveStreamCollector.js
Specialized collector for live stream metrics:
- Uses YouTubeApiClient for API operations
- Integrates with database models
- Provides collection workflow for multiple channels
- Includes progress reporting and logging

### youtubeService.js
General-purpose YouTube service:
- Video details retrieval
- Channel information lookup
- Video search functionality
- Enhanced with YouTubeApiClient error handling

## Usage

### Basic Example

```javascript
const { YouTubeApiClient } = require('./youtubeApiClient');
const client = new YouTubeApiClient();

// Resolve channel handle
const { channelId, channelTitle } = await client.resolveChannelHandle('@ciidb');

// Get live streams for a date
const streams = await client.searchLiveStreams(
  channelId,
  '2024-01-01',
  '2024-01-31'
);

// Get video statistics
const videoIds = streams.map(s => s.id.videoId);
const statistics = await client.getVideoStatistics(videoIds);

// Check quota usage
const quota = client.getQuotaUsage();
console.log(`Used: ${quota.used} / ${quota.limit}`);
```

### Error Handling

```javascript
const { YouTubeApiError } = require('./youtubeApiClient');

try {
  await client.resolveChannelHandle('@example');
} catch (error) {
  if (error instanceof YouTubeApiError) {
    switch (error.type) {
      case 'QUOTA_EXCEEDED':
        // Handle quota exceeded
        break;
      case 'AUTH_ERROR':
        // Handle authentication error
        break;
      case 'NOT_FOUND':
        // Handle not found
        break;
      default:
        // Handle other errors
    }
  }
}
```

## API Methods

### YouTubeApiClient

#### resolveChannelHandle(handle)
Convert channel handle to channel ID and name.

**Parameters:**
- `handle` (string) - Channel handle with or without @

**Returns:**
```javascript
{
  channelId: string,
  channelTitle: string
}
```

**Quota Cost:** 1 unit (forHandle) or 100 units (search fallback)

---

#### searchLiveStreams(channelId, startDate, endDate, options)
Search for live streams on a channel.

**Parameters:**
- `channelId` (string) - YouTube channel ID
- `startDate` (string) - Start date (YYYY-MM-DD)
- `endDate` (string) - End date (YYYY-MM-DD)
- `options` (object, optional)
  - `eventType` - 'completed', 'live', or 'upcoming'
  - `maxResults` - Results per page (default: 50)
  - `order` - Sort order (default: 'date')

**Returns:** Array of search result items

**Quota Cost:** 100 units per page

---

#### getVideoStatistics(videoIds)
Get detailed statistics for videos.

**Parameters:**
- `videoIds` (array) - Array of video IDs (up to 50)

**Returns:** Array of video details with statistics

**Quota Cost:** 1 unit per batch of 50 videos

---

#### getLiveStreamViewCounts(channelId, date)
Get aggregated view counts for a specific date.

**Parameters:**
- `channelId` (string) - YouTube channel ID
- `date` (string) - Date (YYYY-MM-DD)

**Returns:**
```javascript
{
  date: string,
  totalViews: number,
  streamCount: number,
  streams: Array<{
    videoId: string,
    title: string,
    publishedAt: string,
    viewCount: number,
    likeCount: number,
    commentCount: number
  }>
}
```

---

#### getLiveStreamAggregateViews(channelId, startDate, endDate)
Get aggregated view counts over a date range.

**Parameters:**
- `channelId` (string) - YouTube channel ID
- `startDate` (string) - Start date (YYYY-MM-DD)
- `endDate` (string) - End date (YYYY-MM-DD)

**Returns:** Object with dates as keys, each containing:
```javascript
{
  date: string,
  totalViews: number,
  streamCount: number,
  videoIds: Array<string>
}
```

---

#### getQuotaUsage()
Get current quota usage information.

**Returns:**
```javascript
{
  used: number,
  limit: number,
  remaining: number,
  percentage: string
}
```

---

#### validateApiKey()
Validate that YouTube API key is configured.

**Throws:** YouTubeApiError with type 'AUTH_ERROR' if invalid

---

#### checkQuota(cost)
Check if quota allows a request.

**Parameters:**
- `cost` (number) - Quota cost of operation

**Throws:** YouTubeApiError with type 'QUOTA_EXCEEDED' if limit reached

## Error Types

| Type | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_ERROR` | Invalid or missing API key | 401 |
| `QUOTA_EXCEEDED` | Daily quota limit reached | 429 |
| `NOT_FOUND` | Resource not found | 404 |
| `INVALID_REQUEST` | Invalid parameters | 400 |
| `NETWORK_ERROR` | Network connectivity issue | 503 |
| `SERVER_ERROR` | YouTube API server error | 502 |
| `UNKNOWN_ERROR` | Unclassified error | 500 |

## Configuration

### Environment Variables

```env
YOUTUBE_API_KEY=your_api_key_here
YOUTUBE_API_QUOTA_LIMIT=10000
```

### Client Settings

```javascript
const client = new YouTubeApiClient();

// Configure retry behavior
client.maxRetries = 5;
client.retryDelay = 2000; // 2 seconds

// Configure rate limiting
client.rateLimitDelay = 200; // 200ms between requests
```

## Testing

Run the test suite:
```bash
npm run test:youtube-api
```

Run the example:
```bash
npm run example:youtube-api
```

## Quota Costs

Common operations:
- **channels.list** (forHandle): 1 unit
- **channels.list** (by ID): 1 unit
- **videos.list**: 1 unit
- **search.list**: 100 units

Example workflow (per channel):
```
1. Resolve handle: 1 unit
2. Search streams: 100 units
3. Get statistics: 1 unit
Total: 102 units

Daily limit: 10,000 units
Capacity: ~98 channels/day
```

## Best Practices

1. **Cache channel lookups** - Store channelId after first resolution
2. **Batch requests** - Request up to 50 videos at once
3. **Monitor quota** - Check usage regularly with `getQuotaUsage()`
4. **Handle errors** - Always wrap calls in try-catch
5. **Use forHandle** - More efficient than search for channel resolution

## Integration Examples

### With LiveStreamCollector
```javascript
const collector = require('./liveStreamCollector');

const results = await collector.collectMetrics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

console.log(`Processed ${results.successful} channels`);
const quota = collector.getQuotaUsage();
console.log(`Quota used: ${quota.used}`);
```

### With Express Routes
```javascript
const { YouTubeApiClient } = require('../services/youtubeApiClient');
const client = new YouTubeApiClient();

router.get('/channel/:handle', async (req, res) => {
  try {
    const result = await client.resolveChannelHandle(req.params.handle);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Documentation

For more information, see:
- [YOUTUBE_API.md](../../YOUTUBE_API.md) - Comprehensive API documentation
- [YOUTUBE_API_ROUTES.md](../../YOUTUBE_API_ROUTES.md) - REST API documentation
- [YOUTUBE_API_QUICKSTART.md](../../YOUTUBE_API_QUICKSTART.md) - Quick start guide

## Support

For issues or questions:
1. Check error type and message
2. Review troubleshooting guide in YOUTUBE_API.md
3. Verify API key configuration
4. Check quota usage
5. Review YouTube API documentation
