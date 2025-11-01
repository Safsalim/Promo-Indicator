# API Documentation

Complete API reference for Promo-Indicator.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, no authentication is required for API endpoints. The YouTube API key is configured server-side.

---

## YouTube API Endpoints

### Get Video Details

Fetch detailed information about a specific YouTube video.

**Endpoint:** `GET /api/youtube/video/:videoId`

**Parameters:**
- `videoId` (path) - YouTube video ID

**Example Request:**
```bash
curl http://localhost:3000/api/youtube/video/dQw4w9WgXcQ
```

**Example Response:**
```json
{
  "kind": "youtube#video",
  "id": "dQw4w9WgXcQ",
  "snippet": {
    "title": "Video Title",
    "channelTitle": "Channel Name",
    "publishedAt": "2023-01-01T00:00:00Z",
    "description": "Video description..."
  },
  "statistics": {
    "viewCount": "1000000",
    "likeCount": "50000",
    "commentCount": "1000"
  }
}
```

---

### Get Channel Details

Fetch information about a YouTube channel.

**Endpoint:** `GET /api/youtube/channel/:channelId`

**Parameters:**
- `channelId` (path) - YouTube channel ID

**Example Request:**
```bash
curl http://localhost:3000/api/youtube/channel/UCuAXFkgsw1L7xaCfnd5JJOw
```

**Example Response:**
```json
{
  "kind": "youtube#channel",
  "id": "UCuAXFkgsw1L7xaCfnd5JJOw",
  "snippet": {
    "title": "Channel Name",
    "description": "Channel description..."
  },
  "statistics": {
    "subscriberCount": "100000",
    "videoCount": "500",
    "viewCount": "5000000"
  }
}
```

---

### Get Channel Videos

List videos from a specific channel.

**Endpoint:** `GET /api/youtube/channel/:channelId/videos`

**Parameters:**
- `channelId` (path) - YouTube channel ID
- `maxResults` (query, optional) - Number of results (default: 10)

**Example Request:**
```bash
curl "http://localhost:3000/api/youtube/channel/UCuAXFkgsw1L7xaCfnd5JJOw/videos?maxResults=5"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": {
        "videoId": "abc123"
      },
      "snippet": {
        "title": "Video Title",
        "publishedAt": "2023-01-01T00:00:00Z"
      }
    }
  ]
}
```

---

### Search Videos

Search for videos on YouTube.

**Endpoint:** `GET /api/youtube/search`

**Parameters:**
- `q` (query, required) - Search query
- `maxResults` (query, optional) - Number of results (default: 10)

**Example Request:**
```bash
curl "http://localhost:3000/api/youtube/search?q=nodejs+tutorial&maxResults=5"
```

**Example Response:**
```json
{
  "items": [
    {
      "id": {
        "videoId": "xyz789"
      },
      "snippet": {
        "title": "Node.js Tutorial",
        "channelTitle": "Tech Channel",
        "publishedAt": "2023-01-01T00:00:00Z"
      }
    }
  ]
}
```

---

## Promo Analysis Endpoints

### Get All Tracked Videos

Retrieve all videos stored in the local database.

**Endpoint:** `GET /api/promo/videos`

**Example Request:**
```bash
curl http://localhost:3000/api/promo/videos
```

**Example Response:**
```json
[
  {
    "id": "dQw4w9WgXcQ",
    "channel_id": "UCuAXFkgsw1L7xaCfnd5JJOw",
    "title": "Video Title",
    "description": "Description...",
    "published_at": "2023-01-01T00:00:00Z",
    "created_at": "2024-01-01T10:00:00Z"
  }
]
```

---

### Get Video Statistics History

Retrieve historical statistics for a specific video.

**Endpoint:** `GET /api/promo/stats/:videoId`

**Parameters:**
- `videoId` (path) - YouTube video ID

**Example Request:**
```bash
curl http://localhost:3000/api/promo/stats/dQw4w9WgXcQ
```

**Example Response:**
```json
[
  {
    "id": 1,
    "video_id": "dQw4w9WgXcQ",
    "view_count": 1000000,
    "like_count": 50000,
    "comment_count": 1000,
    "recorded_at": "2024-01-01T10:00:00Z"
  },
  {
    "id": 2,
    "video_id": "dQw4w9WgXcQ",
    "view_count": 1050000,
    "like_count": 52000,
    "comment_count": 1050,
    "recorded_at": "2024-01-02T10:00:00Z"
  }
]
```

---

### Analyze Promo Indicators

Analyze a video's statistics to detect promotional activity.

**Endpoint:** `GET /api/promo/analyze/:videoId`

**Parameters:**
- `videoId` (path) - YouTube video ID

**Example Request:**
```bash
curl http://localhost:3000/api/promo/analyze/dQw4w9WgXcQ
```

**Example Response:**
```json
[
  {
    "type": "high_view_growth",
    "value": 75.5,
    "timestamp": "2024-01-02T10:00:00Z"
  },
  {
    "type": "high_engagement_growth",
    "value": 60.2,
    "timestamp": "2024-01-02T10:00:00Z"
  }
]
```

---

### Get Promo Indicators

Retrieve saved promo indicators for a video.

**Endpoint:** `GET /api/promo/indicators/:videoId`

**Parameters:**
- `videoId` (path) - YouTube video ID

**Example Request:**
```bash
curl http://localhost:3000/api/promo/indicators/dQw4w9WgXcQ
```

**Example Response:**
```json
[
  {
    "id": 1,
    "video_id": "dQw4w9WgXcQ",
    "indicator_type": "sponsored_promotion",
    "indicator_value": 85.5,
    "detected_at": "2024-01-01T10:00:00Z",
    "notes": "Unusual spike in views"
  }
]
```

---

### Save Promo Indicator

Save a new promotional indicator for a video.

**Endpoint:** `POST /api/promo/indicators`

**Request Body:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "indicatorType": "sponsored_promotion",
  "indicatorValue": 85.5,
  "notes": "Detected unusual activity"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/promo/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "dQw4w9WgXcQ",
    "indicatorType": "sponsored_promotion",
    "indicatorValue": 85.5,
    "notes": "Detected unusual activity"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "id": 1
}
```

---

## Health Check

### Check API Status

Verify that the API is running.

**Endpoint:** `GET /api/health`

**Example Request:**
```bash
curl http://localhost:3000/api/health
```

**Example Response:**
```json
{
  "status": "ok",
  "message": "Promo-Indicator API is running"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

**Example Error Response:**
```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created (for POST requests)
- `400` - Bad Request (missing required parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

YouTube API has a quota limit of 10,000 units per day. Different operations cost:
- Video details: 1 unit
- Search: 100 units
- Channel details: 1 unit

Monitor your usage in the [Google Cloud Console](https://console.developers.google.com/).

---

## Notes

- All timestamps are in ISO 8601 format
- Video IDs are YouTube's standard 11-character identifiers
- Channel IDs are YouTube's standard 24-character identifiers (starting with UC)
- All numeric values are returned as strings from YouTube API but stored as numbers in the database
