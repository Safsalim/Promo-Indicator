# YouTube API Integration - Quick Start Guide

## Setup (5 minutes)

### 1. Get YouTube API Key
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a project (or select existing)
3. Enable "YouTube Data API v3"
4. Create API Key in Credentials
5. Copy the API key

### 2. Configure Environment
```bash
# Edit .env file
YOUTUBE_API_KEY=your_api_key_here
YOUTUBE_API_QUOTA_LIMIT=10000
```

### 3. Install & Test
```bash
npm install
npm test
```

## Basic Usage

### Resolve Channel Handle
```javascript
const { YouTubeApiClient } = require('./src/services/youtubeApiClient');
const client = new YouTubeApiClient();

const { channelId, channelTitle } = await client.resolveChannelHandle('@ciidb');
console.log(channelId);  // UCxxxxxxxxxxxxxxxxxx
```

### Get Live Stream Views for a Date
```javascript
const viewData = await client.getLiveStreamViewCounts(channelId, '2024-01-15');
console.log(`Views: ${viewData.totalViews}, Streams: ${viewData.streamCount}`);
```

### Get Aggregate Views for Date Range
```javascript
const aggregate = await client.getLiveStreamAggregateViews(
  channelId,
  '2024-01-01',
  '2024-01-31'
);

for (const date in aggregate) {
  const data = aggregate[date];
  console.log(`${date}: ${data.streamCount} streams, ${data.totalViews} views`);
}
```

### Check Quota Usage
```javascript
const quota = client.getQuotaUsage();
console.log(`Used: ${quota.used} / ${quota.limit} (${quota.percentage}%)`);
```

## Error Handling

```javascript
try {
  await client.resolveChannelHandle('@invalid');
} catch (error) {
  console.log(error.type);     // NOT_FOUND, QUOTA_EXCEEDED, etc.
  console.log(error.message);  // Human-readable error
}
```

### Common Error Types
- `AUTH_ERROR` - Check your API key
- `QUOTA_EXCEEDED` - Wait for quota reset (midnight Pacific)
- `NOT_FOUND` - Channel doesn't exist
- `NETWORK_ERROR` - Check internet connection

## REST API Usage

Start the server:
```bash
npm start
```

### Examples

```bash
# Resolve channel
curl http://localhost:3000/api/youtube-api/resolve-channel/@ciidb

# Get live stream views
curl "http://localhost:3000/api/youtube-api/channel/UCxxxx/livestream-views?date=2024-01-15"

# Get aggregate views
curl "http://localhost:3000/api/youtube-api/channel/UCxxxx/livestream-aggregate?startDate=2024-01-01&endDate=2024-01-31"

# Check quota
curl http://localhost:3000/api/youtube-api/quota
```

## Run Examples

### Interactive Example
```bash
npm run example:youtube-api
```

### Run Tests
```bash
npm run test:youtube-api
```

## Quota Management

Daily limit: 10,000 units (default)

### Operation Costs
- Resolve channel (forHandle): 1 unit
- Resolve channel (search): 100 units
- Search live streams: 100 units per page
- Get video statistics: 1 unit per 50 videos

### Example Calculation
```
1 channel lookup: 1 unit
1 live stream search: 100 units
50 video stats: 1 unit
Total: 102 units

Daily capacity: ~98 channels
```

### Check Usage
```javascript
const quota = client.getQuotaUsage();
if (quota.percentage > 80) {
  console.warn('Approaching quota limit!');
}
```

## Best Practices

### 1. Cache Channel Lookups
```javascript
const cache = new Map();

async function getCachedChannelId(handle) {
  if (!cache.has(handle)) {
    const { channelId } = await client.resolveChannelHandle(handle);
    cache.set(handle, channelId);
  }
  return cache.get(handle);
}
```

### 2. Batch Video Requests
```javascript
// Good - 1 quota unit
await client.getVideoStatistics(['id1', 'id2', 'id3']);

// Bad - 3 quota units
for (const id of ids) {
  await client.getVideoStatistics([id]);
}
```

### 3. Handle Errors Gracefully
```javascript
try {
  await processChannels();
} catch (error) {
  if (error.type === 'QUOTA_EXCEEDED') {
    saveProgress();
    scheduleForTomorrow();
  }
}
```

## Common Issues

### "Invalid API Key"
- Check `.env` file has correct key
- Verify YouTube Data API v3 is enabled
- Check for extra spaces in `.env`

### "Quota Exceeded"
- Wait for daily reset (midnight Pacific)
- Request quota increase in Google Cloud Console
- Optimize API usage

### "Channel Not Found"
- Verify channel exists and is public
- Include @ in handle: `@channelname`
- Try using channel ID directly

## Next Steps

- Read [YOUTUBE_API.md](./YOUTUBE_API.md) for comprehensive documentation
- See [YOUTUBE_API_ROUTES.md](./YOUTUBE_API_ROUTES.md) for REST API details
- Check [YOUTUBE_API_IMPLEMENTATION.md](./YOUTUBE_API_IMPLEMENTATION.md) for technical details

## Support

- [YouTube API Documentation](https://developers.google.com/youtube/v3)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Google Cloud Console](https://console.developers.google.com/)
