# YouTube API Integration Documentation

This document provides detailed information about the YouTube Data API v3 integration in the Promo-Indicator project.

## Overview

The YouTube API integration allows the application to:
- Resolve channel handles (e.g., @ciidb) to channel IDs
- Fetch live stream data for specified channels
- Retrieve video statistics including view counts
- Handle pagination for large result sets
- Track and enforce API quota limits
- Provide comprehensive error handling

## Architecture

### Core Components

1. **YouTubeApiClient** (`src/services/youtubeApiClient.js`)
   - Central API client with error handling and rate limiting
   - Manages quota tracking and validation
   - Provides retry logic for transient errors

2. **YouTubeService** (`src/services/youtubeService.js`)
   - High-level service for general YouTube operations
   - Uses YouTubeApiClient for enhanced error handling

3. **LiveStreamCollector** (`src/services/liveStreamCollector.js`)
   - Specialized service for collecting live stream metrics
   - Integrates with database models for persistence

## Authentication

### API Key Setup

1. Obtain a YouTube Data API v3 key from [Google Cloud Console](https://console.developers.google.com/)
2. Add the key to your `.env` file:

```env
YOUTUBE_API_KEY=your_actual_api_key_here
YOUTUBE_API_QUOTA_LIMIT=10000
```

3. The API client validates the key before making requests

### Error Handling

The integration handles authentication errors gracefully:

```javascript
try {
  const result = await client.resolveChannelHandle('@example');
} catch (error) {
  if (error.type === 'AUTH_ERROR') {
    // Handle authentication error
    console.error('Invalid or missing API key');
  }
}
```

## Key Features

### 1. Channel Handle Resolution

Convert a YouTube channel handle to a channel ID:

```javascript
const { YouTubeApiClient } = require('./services/youtubeApiClient');
const client = new YouTubeApiClient();

const { channelId, channelTitle } = await client.resolveChannelHandle('@ciidb');
console.log(`Channel ID: ${channelId}`);
console.log(`Channel Name: ${channelTitle}`);
```

**Implementation Details:**
- First attempts using `channels.list` with `forHandle` parameter (1 quota unit)
- Falls back to `search.list` if not found (100 quota units)
- Throws `NOT_FOUND` error if channel doesn't exist

### 2. Live Stream Search

Fetch live streams for a channel within a date range:

```javascript
const liveStreams = await client.searchLiveStreams(
  channelId,
  '2024-01-01',
  '2024-01-31',
  {
    eventType: 'completed',  // completed, live, or upcoming
    maxResults: 50,
    order: 'date'
  }
);
```

**Implementation Details:**
- Automatically handles pagination
- Configurable max results per page (default: 50)
- Safety limit of 10 pages per request
- Costs 100 quota units per page

### 3. Video Statistics

Get detailed statistics for multiple videos:

```javascript
const videoIds = ['video_id_1', 'video_id_2', 'video_id_3'];
const statistics = await client.getVideoStatistics(videoIds);

statistics.forEach(stat => {
  console.log(`Video: ${stat.snippet.title}`);
  console.log(`Views: ${stat.statistics.viewCount}`);
  console.log(`Likes: ${stat.statistics.likeCount}`);
});
```

**Implementation Details:**
- Processes videos in chunks of 50
- Returns full video details including live stream information
- Costs 1 quota unit per 50 videos

### 4. Aggregate View Counts

Get total view counts for all live streams on specific dates:

```javascript
// Single date
const viewData = await client.getLiveStreamViewCounts(channelId, '2024-01-15');
console.log(`Total Views: ${viewData.totalViews}`);
console.log(`Stream Count: ${viewData.streamCount}`);

// Date range
const aggregateData = await client.getLiveStreamAggregateViews(
  channelId,
  '2024-01-01',
  '2024-01-31'
);

Object.keys(aggregateData).forEach(date => {
  const data = aggregateData[date];
  console.log(`${date}: ${data.streamCount} streams, ${data.totalViews} views`);
});
```

## Error Handling

### Error Types

The API client categorizes errors into specific types:

| Error Type | Description | Example Causes |
|------------|-------------|----------------|
| `AUTH_ERROR` | Authentication failed | Invalid API key, API not enabled |
| `QUOTA_EXCEEDED` | Daily quota limit reached | Too many API calls |
| `NOT_FOUND` | Resource not found | Invalid channel handle, video ID |
| `INVALID_REQUEST` | Malformed request | Bad parameters |
| `NETWORK_ERROR` | Network or connectivity issue | Internet down, timeout |
| `SERVER_ERROR` | YouTube API server error | API outage (5xx errors) |
| `UNKNOWN_ERROR` | Unclassified error | Other unexpected errors |

### Handling Errors

```javascript
const { YouTubeApiError } = require('./services/youtubeApiClient');

try {
  await client.resolveChannelHandle('@example');
} catch (error) {
  if (error instanceof YouTubeApiError) {
    switch (error.type) {
      case 'QUOTA_EXCEEDED':
        console.error('Daily quota exceeded. Try again tomorrow.');
        break;
      
      case 'AUTH_ERROR':
        console.error('Check your API key configuration.');
        break;
      
      case 'NOT_FOUND':
        console.error('Channel not found.');
        break;
      
      case 'NETWORK_ERROR':
        console.error('Network issue. Retrying...');
        // Implement retry logic
        break;
      
      default:
        console.error(`Error: ${error.message}`);
    }
  }
}
```

### Retry Logic

The API client automatically retries failed requests with exponential backoff:

- **Retries:** 3 attempts by default
- **Backoff:** 1s, 2s, 4s
- **Skips retry for:** QUOTA_EXCEEDED, AUTH_ERROR, INVALID_REQUEST

Configure retry behavior:

```javascript
const client = new YouTubeApiClient();
client.maxRetries = 5;
client.retryDelay = 2000; // 2 seconds initial delay
```

## Rate Limiting

### Quota Management

The API client tracks quota usage to prevent exceeding limits:

```javascript
const quotaUsage = client.getQuotaUsage();
console.log(`Used: ${quotaUsage.used} / ${quotaUsage.limit}`);
console.log(`Remaining: ${quotaUsage.remaining}`);
console.log(`Percentage: ${quotaUsage.percentage}%`);
```

### Rate Limiting

Requests are automatically rate-limited with a configurable delay:

```javascript
const client = new YouTubeApiClient();
client.rateLimitDelay = 200; // 200ms between requests
```

### Quota Costs

Common operations and their quota costs:

| Operation | Quota Cost |
|-----------|------------|
| channels.list | 1 unit |
| videos.list | 1 unit |
| search.list | 100 units |

**Example calculation:**
```
Resolve channel handle (forHandle): 1 unit
Search live streams (1 page): 100 units
Get video statistics (50 videos): 1 unit
Total: 102 units
```

With a default quota of 10,000 units/day, you can process approximately 98 channels per day.

## Best Practices

### 1. Use forHandle When Possible

```javascript
// Preferred (1 quota unit)
await client.resolveChannelHandle('@channelname');

// Instead of search (100 quota units)
```

### 2. Batch Video Requests

```javascript
// Good - batch request (1 quota unit)
await client.getVideoStatistics(['id1', 'id2', 'id3', ...]);

// Avoid - individual requests (3 quota units)
for (const id of videoIds) {
  await getVideoStatistics([id]);
}
```

### 3. Handle Quota Limits Gracefully

```javascript
try {
  await processChannels();
} catch (error) {
  if (error.type === 'QUOTA_EXCEEDED') {
    // Save progress and resume tomorrow
    saveProgress();
    scheduleResumeForTomorrow();
  }
}
```

### 4. Monitor Quota Usage

```javascript
const usage = client.getQuotaUsage();
if (usage.percentage > 80) {
  console.warn('Approaching quota limit. Consider reducing operations.');
}
```

### 5. Cache Results When Appropriate

```javascript
// Cache channel resolutions
const channelCache = new Map();

async function getCachedChannelId(handle) {
  if (!channelCache.has(handle)) {
    const result = await client.resolveChannelHandle(handle);
    channelCache.set(handle, result);
  }
  return channelCache.get(handle);
}
```

## Example Usage

See `src/examples/youtubeApiExample.js` for complete working examples:

```bash
node src/examples/youtubeApiExample.js
```

## Testing

Run the unit tests:

```bash
node src/tests/youtubeApiClient.test.js
```

The test suite includes:
- Unit tests (no API key required)
- Integration tests (requires valid API key)

## Troubleshooting

### Common Issues

#### 1. "Invalid API Key" Error

**Problem:** `AUTH_ERROR` when making requests

**Solutions:**
- Verify API key is set in `.env` file
- Check key is valid in Google Cloud Console
- Ensure YouTube Data API v3 is enabled
- Verify no extra spaces or quotes in `.env`

#### 2. "Quota Exceeded" Error

**Problem:** `QUOTA_EXCEEDED` error

**Solutions:**
- Wait for daily quota reset (midnight Pacific Time)
- Request quota increase in Google Cloud Console
- Optimize API usage (use caching, batch requests)
- Monitor quota usage with `getQuotaUsage()`

#### 3. "Channel Not Found" Error

**Problem:** `NOT_FOUND` when resolving channel handle

**Solutions:**
- Verify channel handle is correct (include @)
- Check channel exists and is public
- Try using channel ID directly instead of handle

#### 4. Network Timeouts

**Problem:** `NETWORK_ERROR` with timeout messages

**Solutions:**
- Check internet connection
- Verify firewall allows YouTube API access
- Increase timeout settings if needed
- The client automatically retries transient errors

## API Endpoints Reference

### channels.list
- **Purpose:** Get channel details by ID or handle
- **Quota Cost:** 1 unit
- **Parameters:**
  - `part`: Data to retrieve (snippet, statistics, etc.)
  - `id`: Channel ID(s)
  - `forHandle`: Channel handle (without @)

### search.list
- **Purpose:** Search for videos, channels, or playlists
- **Quota Cost:** 100 units
- **Parameters:**
  - `part`: Data to retrieve
  - `channelId`: Filter by channel
  - `eventType`: Filter by broadcast type (live, completed, upcoming)
  - `type`: Resource type (video, channel, playlist)
  - `publishedAfter`: Date filter (ISO 8601)
  - `publishedBefore`: Date filter (ISO 8601)
  - `maxResults`: Results per page (1-50)
  - `pageToken`: Pagination token

### videos.list
- **Purpose:** Get video details and statistics
- **Quota Cost:** 1 unit
- **Parameters:**
  - `part`: Data to retrieve (snippet, statistics, liveStreamingDetails)
  - `id`: Video ID(s) - up to 50 per request

## Additional Resources

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3)
- [API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Google Cloud Console](https://console.developers.google.com/)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)

## Support

For issues or questions:
1. Check this documentation
2. Review error messages and types
3. Consult YouTube API documentation
4. Check API status at [Google API Status Dashboard](https://status.cloud.google.com/)
