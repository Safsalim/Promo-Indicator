# YouTube API Routes Documentation

This document describes the REST API endpoints for accessing YouTube API functionality.

## Base URL

```
http://localhost:3000/api/youtube-api
```

## Authentication

All endpoints require a valid YouTube API key to be configured in the `.env` file. The API key is not passed in requests; it's configured server-side.

## Endpoints

### 1. Resolve Channel Handle

Convert a YouTube channel handle to channel ID and name.

**Endpoint:** `GET /resolve-channel/:handle`

**Parameters:**
- `handle` (path) - Channel handle (with or without @)

**Example Request:**
```bash
curl http://localhost:3000/api/youtube-api/resolve-channel/@ciidb
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "channelId": "UCxxxxxxxxxxxxxxxxxx",
    "channelTitle": "Channel Name"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "type": "NOT_FOUND",
    "message": "Channel not found for handle: @invalid"
  }
}
```

---

### 2. Get Live Streams

Search for live streams on a channel within a date range.

**Endpoint:** `GET /channel/:channelId/livestreams`

**Parameters:**
- `channelId` (path) - YouTube channel ID
- `startDate` (query, required) - Start date (YYYY-MM-DD)
- `endDate` (query, required) - End date (YYYY-MM-DD)
- `eventType` (query, optional) - Event type: `completed`, `live`, or `upcoming` (default: `completed`)
- `maxResults` (query, optional) - Results per page (default: 50)

**Example Request:**
```bash
curl "http://localhost:3000/api/youtube-api/channel/UCxxxxxxxxxxxxxxxxxx/livestreams?startDate=2024-01-01&endDate=2024-01-31"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "count": 15,
    "streams": [
      {
        "kind": "youtube#searchResult",
        "id": {
          "videoId": "abc123"
        },
        "snippet": {
          "publishedAt": "2024-01-15T10:00:00Z",
          "channelId": "UCxxxxxxxxxxxxxxxxxx",
          "title": "Live Stream Title",
          "description": "Stream description",
          "thumbnails": { ... }
        }
      }
    ]
  }
}
```

---

### 3. Get Live Stream View Counts

Get aggregated view counts for live streams on a specific date.

**Endpoint:** `GET /channel/:channelId/livestream-views`

**Parameters:**
- `channelId` (path) - YouTube channel ID
- `date` (query, required) - Date (YYYY-MM-DD)

**Example Request:**
```bash
curl "http://localhost:3000/api/youtube-api/channel/UCxxxxxxxxxxxxxxxxxx/livestream-views?date=2024-01-15"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "totalViews": 15000,
    "streamCount": 3,
    "streams": [
      {
        "videoId": "abc123",
        "title": "Live Stream Title",
        "publishedAt": "2024-01-15T10:00:00Z",
        "viewCount": 5000,
        "likeCount": 250,
        "commentCount": 120
      }
    ]
  }
}
```

---

### 4. Get Live Stream Aggregate Views

Get aggregated view counts for live streams over a date range.

**Endpoint:** `GET /channel/:channelId/livestream-aggregate`

**Parameters:**
- `channelId` (path) - YouTube channel ID
- `startDate` (query, required) - Start date (YYYY-MM-DD)
- `endDate` (query, required) - End date (YYYY-MM-DD)

**Example Request:**
```bash
curl "http://localhost:3000/api/youtube-api/channel/UCxxxxxxxxxxxxxxxxxx/livestream-aggregate?startDate=2024-01-01&endDate=2024-01-31"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "totalDates": 10,
    "totalStreams": 25,
    "totalViews": 125000,
    "byDate": {
      "2024-01-15": {
        "date": "2024-01-15",
        "totalViews": 15000,
        "streamCount": 3,
        "videoIds": ["abc123", "def456", "ghi789"]
      },
      "2024-01-20": {
        "date": "2024-01-20",
        "totalViews": 20000,
        "streamCount": 2,
        "videoIds": ["jkl012", "mno345"]
      }
    }
  }
}
```

---

### 5. Get Video Statistics

Get detailed statistics for multiple videos.

**Endpoint:** `POST /videos/statistics`

**Body Parameters:**
- `videoIds` (array, required) - Array of video IDs (max 50 per request)

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/youtube-api/videos/statistics \
  -H "Content-Type: application/json" \
  -d '{"videoIds": ["abc123", "def456", "ghi789"]}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "count": 3,
    "videos": [
      {
        "id": "abc123",
        "snippet": {
          "title": "Video Title",
          "publishedAt": "2024-01-15T10:00:00Z"
        },
        "statistics": {
          "viewCount": "5000",
          "likeCount": "250",
          "commentCount": "120"
        },
        "liveStreamingDetails": {
          "actualStartTime": "2024-01-15T10:00:00Z",
          "actualEndTime": "2024-01-15T12:00:00Z"
        }
      }
    ]
  }
}
```

---

### 6. Get API Quota Usage

Get current API quota usage information.

**Endpoint:** `GET /quota`

**Example Request:**
```bash
curl http://localhost:3000/api/youtube-api/quota
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "used": 352,
    "limit": 10000,
    "remaining": 9648,
    "percentage": "3.52"
  }
}
```

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "Human-readable error message"
  }
}
```

### Error Types and HTTP Status Codes

| Error Type | HTTP Status | Description |
|------------|-------------|-------------|
| `AUTH_ERROR` | 401 | Invalid or missing API key |
| `QUOTA_EXCEEDED` | 429 | API quota limit reached |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `NETWORK_ERROR` | 503 | Network connectivity issue |
| `SERVER_ERROR` | 502 | YouTube API server error |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "type": "QUOTA_EXCEEDED",
    "message": "Quota limit exceeded. Used: 10000, Limit: 10000, Requested: 100"
  }
}
```

---

## Rate Limiting

The API includes automatic rate limiting:
- 100ms delay between requests
- Automatic retry with exponential backoff (3 attempts)
- Quota tracking to prevent exceeding limits

---

## Complete Usage Example

### Workflow: Get Live Stream Views for a Channel

1. **Resolve channel handle to ID:**
```bash
curl http://localhost:3000/api/youtube-api/resolve-channel/@ciidb
```

Response:
```json
{
  "success": true,
  "data": {
    "channelId": "UCxxxxxxxxxxxxxxxxxx",
    "channelTitle": "Channel Name"
  }
}
```

2. **Get live stream aggregate views:**
```bash
curl "http://localhost:3000/api/youtube-api/channel/UCxxxxxxxxxxxxxxxxxx/livestream-aggregate?startDate=2024-01-01&endDate=2024-01-31"
```

3. **Check quota usage:**
```bash
curl http://localhost:3000/api/youtube-api/quota
```

---

## Integration Examples

### JavaScript (Fetch API)

```javascript
async function getChannelLiveStreamViews(handle, startDate, endDate) {
  // Step 1: Resolve channel handle
  const resolveResponse = await fetch(
    `http://localhost:3000/api/youtube-api/resolve-channel/${handle}`
  );
  const { data: { channelId } } = await resolveResponse.json();
  
  // Step 2: Get aggregate views
  const viewsResponse = await fetch(
    `http://localhost:3000/api/youtube-api/channel/${channelId}/livestream-aggregate?` +
    `startDate=${startDate}&endDate=${endDate}`
  );
  const { data } = await viewsResponse.json();
  
  return data;
}

// Usage
getChannelLiveStreamViews('@ciidb', '2024-01-01', '2024-01-31')
  .then(data => {
    console.log(`Total Views: ${data.totalViews}`);
    console.log(`Total Streams: ${data.totalStreams}`);
  })
  .catch(error => console.error('Error:', error));
```

### Python (requests)

```python
import requests

def get_channel_livestream_views(handle, start_date, end_date):
    base_url = "http://localhost:3000/api/youtube-api"
    
    # Step 1: Resolve channel handle
    resolve_response = requests.get(f"{base_url}/resolve-channel/{handle}")
    channel_id = resolve_response.json()["data"]["channelId"]
    
    # Step 2: Get aggregate views
    views_response = requests.get(
        f"{base_url}/channel/{channel_id}/livestream-aggregate",
        params={"startDate": start_date, "endDate": end_date}
    )
    data = views_response.json()["data"]
    
    return data

# Usage
data = get_channel_livestream_views("@ciidb", "2024-01-01", "2024-01-31")
print(f"Total Views: {data['totalViews']}")
print(f"Total Streams: {data['totalStreams']}")
```

### cURL Script

```bash
#!/bin/bash

HANDLE="@ciidb"
START_DATE="2024-01-01"
END_DATE="2024-01-31"
BASE_URL="http://localhost:3000/api/youtube-api"

# Resolve channel handle
echo "Resolving channel handle..."
CHANNEL_DATA=$(curl -s "$BASE_URL/resolve-channel/$HANDLE")
CHANNEL_ID=$(echo $CHANNEL_DATA | jq -r '.data.channelId')
echo "Channel ID: $CHANNEL_ID"

# Get aggregate views
echo "Fetching live stream views..."
VIEWS_DATA=$(curl -s "$BASE_URL/channel/$CHANNEL_ID/livestream-aggregate?startDate=$START_DATE&endDate=$END_DATE")
echo $VIEWS_DATA | jq '.data'

# Check quota
echo "Checking API quota..."
curl -s "$BASE_URL/quota" | jq '.data'
```

---

## Notes

- All dates should be in `YYYY-MM-DD` format
- Times are in ISO 8601 format (UTC)
- Video IDs are YouTube video identifiers (11 characters)
- Channel IDs start with "UC" and are 24 characters long
- Quota resets daily at midnight Pacific Time

---

## See Also

- [YouTube API Integration Guide](./YOUTUBE_API.md) - Comprehensive API documentation
- [API.md](./API.md) - General API documentation
- [YouTube Data API v3 Reference](https://developers.google.com/youtube/v3/docs)
