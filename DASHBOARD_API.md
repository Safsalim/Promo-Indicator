# Dashboard API Documentation

Complete API reference for the Promo-Indicator Dashboard endpoints.

## Base URL

```
http://localhost:3000/api
```

---

## Channels Management

### GET /api/channels

List all tracked channels with their metadata.

**Endpoint:** `GET /api/channels`

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "channel_handle": "@ciidb",
      "channel_id": "UCxxxxxxxxxxxxxxxx",
      "channel_name": "Channel Name",
      "added_date": "2024-01-01 12:00:00",
      "is_active": 1
    }
  ],
  "count": 1
}
```

**Example Request:**
```bash
curl http://localhost:3000/api/channels
```

**Status Codes:**
- `200` - Success
- `500` - Internal Server Error

---

### POST /api/channels

Add a new channel to track. The endpoint automatically resolves the channel handle using the YouTube API to fetch the channel ID and name.

**Endpoint:** `POST /api/channels`

**Request Body:**
```json
{
  "channel_handle": "@ciidb"
}
```

**Parameters:**
- `channel_handle` (string, required) - YouTube channel handle (with or without @ symbol)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "channel_handle": "@ciidb",
    "channel_id": "UCxxxxxxxxxxxxxxxx",
    "channel_name": "Channel Name",
    "added_date": "2024-01-01 12:00:00",
    "is_active": 1
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/channels \
  -H "Content-Type: application/json" \
  -d '{"channel_handle": "@ciidb"}'
```

**Status Codes:**
- `201` - Created successfully
- `400` - Bad Request (missing or invalid channel_handle)
- `404` - Not Found (channel doesn't exist on YouTube)
- `409` - Conflict (channel already exists in database)
- `500` - Internal Server Error
- `503` - Service Unavailable (YouTube API quota exceeded)

**Error Response Examples:**

Missing channel_handle:
```json
{
  "success": false,
  "error": "channel_handle is required"
}
```

Channel not found:
```json
{
  "success": false,
  "error": "Channel not found: @invalidhandle"
}
```

Channel already exists:
```json
{
  "success": false,
  "error": "Channel with this handle already exists",
  "data": {
    "id": 1,
    "channel_handle": "@ciidb",
    "channel_id": "UCxxxxxxxxxxxxxxxx",
    "channel_name": "Channel Name",
    "added_date": "2024-01-01 12:00:00",
    "is_active": 1
  }
}
```

---

## Metrics

### GET /api/metrics

Query live stream metrics with optional filters. Returns detailed metrics data with channel information, sorted by date ascending.

**Endpoint:** `GET /api/metrics`

**Query Parameters:**
- `channel_ids` (array/string, optional) - Filter by channel IDs (comma-separated or array)
- `start_date` (string, optional) - Start date in YYYY-MM-DD format
- `end_date` (string, optional) - End date in YYYY-MM-DD format
- `limit` (integer, optional) - Maximum number of results to return

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "channel_id": 1,
      "date": "2024-01-15",
      "total_live_stream_views": 5000,
      "live_stream_count": 3,
      "created_at": "2024-01-16 10:00:00",
      "channel_handle": "@ciidb",
      "channel_name": "Channel Name",
      "youtube_channel_id": "UCxxxxxxxxxxxxxxxx"
    }
  ],
  "count": 1,
  "filters": {
    "channel_ids": [1],
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "limit": null
  }
}
```

**Example Requests:**

Get all metrics:
```bash
curl http://localhost:3000/api/metrics
```

Filter by channel IDs:
```bash
curl "http://localhost:3000/api/metrics?channel_ids=1,2,3"
```

Filter by date range:
```bash
curl "http://localhost:3000/api/metrics?start_date=2024-01-01&end_date=2024-01-31"
```

Multiple filters with limit:
```bash
curl "http://localhost:3000/api/metrics?channel_ids=1,2&start_date=2024-01-01&end_date=2024-01-31&limit=50"
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error

**Error Response Examples:**

Invalid date format:
```json
{
  "success": false,
  "error": "start_date must be in YYYY-MM-DD format"
}
```

Invalid channel IDs:
```json
{
  "success": false,
  "error": "channel_ids must be valid positive integers"
}
```

---

### GET /api/metrics/summary

Get aggregated summary statistics for metrics data. Includes total views, averages, trends, and per-channel breakdowns.

**Endpoint:** `GET /api/metrics/summary`

**Query Parameters:**
- `channel_ids` (array/string, optional) - Filter by channel IDs (comma-separated or array)
- `start_date` (string, optional) - Start date in YYYY-MM-DD format
- `end_date` (string, optional) - End date in YYYY-MM-DD format

**Response Format:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_records": 30,
      "total_channels": 2,
      "total_days": 15,
      "total_views": 150000,
      "avg_views": 5000,
      "max_views": 12000,
      "min_views": 1000,
      "total_streams": 45,
      "avg_streams": 1.5
    },
    "trend": {
      "direction": "up",
      "percentage": "25.50",
      "first_period_avg": 4000,
      "second_period_avg": 5020
    },
    "channel_breakdown": [
      {
        "id": 1,
        "channel_handle": "@ciidb",
        "channel_name": "Channel Name",
        "record_count": 15,
        "total_views": 75000,
        "avg_views": 5000,
        "total_streams": 22
      },
      {
        "id": 2,
        "channel_handle": "@channel2",
        "channel_name": "Channel 2",
        "record_count": 15,
        "total_views": 75000,
        "avg_views": 5000,
        "total_streams": 23
      }
    ]
  },
  "filters": {
    "channel_ids": [1, 2],
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

**Field Descriptions:**

**Summary Object:**
- `total_records` - Total number of metric records
- `total_channels` - Number of unique channels
- `total_days` - Number of unique dates with data
- `total_views` - Sum of all live stream views
- `avg_views` - Average views per record (rounded)
- `max_views` - Maximum views in a single record
- `min_views` - Minimum views in a single record
- `total_streams` - Total number of live streams
- `avg_streams` - Average number of streams per record

**Trend Object** (only included when date range is provided):
- `direction` - Trend direction: "up", "down", or "stable"
- `percentage` - Percentage change between first and second half of date range
- `first_period_avg` - Average daily views in first half of period
- `second_period_avg` - Average daily views in second half of period

**Channel Breakdown** (only included when filtering by specific channels):
- `id` - Channel ID
- `channel_handle` - Channel handle
- `channel_name` - Channel name
- `record_count` - Number of records for this channel
- `total_views` - Total views for this channel
- `avg_views` - Average views for this channel
- `total_streams` - Total streams for this channel

**Example Requests:**

Get overall summary:
```bash
curl http://localhost:3000/api/metrics/summary
```

Summary for specific channels:
```bash
curl "http://localhost:3000/api/metrics/summary?channel_ids=1,2"
```

Summary with date range (includes trend):
```bash
curl "http://localhost:3000/api/metrics/summary?start_date=2024-01-01&end_date=2024-01-31"
```

Complete example:
```bash
curl "http://localhost:3000/api/metrics/summary?channel_ids=1,2&start_date=2024-01-01&end_date=2024-01-31"
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error

**Error Response Examples:**

Invalid date format:
```json
{
  "success": false,
  "error": "start_date must be in YYYY-MM-DD format"
}
```

Invalid channel IDs:
```json
{
  "success": false,
  "error": "channel_ids must be valid positive integers"
}
```

---

## Common Error Responses

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created (for POST requests)
- `400` - Bad Request (invalid or missing parameters)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists)
- `500` - Internal Server Error
- `503` - Service Unavailable (external service issue)

---

## CORS Configuration

CORS is enabled for all origins. The API accepts requests from any frontend application.

**Allowed Methods:**
- GET
- POST
- PUT
- DELETE
- OPTIONS

**Allowed Headers:**
- Content-Type
- Authorization
- X-Requested-With

---

## Data Types

### Date Format
All dates use ISO 8601 format: `YYYY-MM-DD`

Examples:
- `2024-01-15`
- `2024-12-31`

### Channel Handle Format
Channel handles can be provided with or without the @ symbol:
- `@ciidb` (recommended)
- `ciidb` (also accepted)

### Channel ID Format
Channel IDs are integers:
- Single ID: `1`
- Multiple IDs (comma-separated): `1,2,3`
- Multiple IDs (array): `[1, 2, 3]`

---

## Usage Examples

### JavaScript (Fetch API)

```javascript
// Get all channels
fetch('http://localhost:3000/api/channels')
  .then(response => response.json())
  .then(data => console.log(data));

// Add a new channel
fetch('http://localhost:3000/api/channels', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    channel_handle: '@ciidb'
  })
})
  .then(response => response.json())
  .then(data => console.log(data));

// Get metrics with filters
const params = new URLSearchParams({
  channel_ids: '1,2',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  limit: '50'
});

fetch(`http://localhost:3000/api/metrics?${params}`)
  .then(response => response.json())
  .then(data => console.log(data));

// Get summary statistics
fetch('http://localhost:3000/api/metrics/summary?channel_ids=1,2&start_date=2024-01-01&end_date=2024-01-31')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Python (requests library)

```python
import requests

# Get all channels
response = requests.get('http://localhost:3000/api/channels')
channels = response.json()

# Add a new channel
response = requests.post(
    'http://localhost:3000/api/channels',
    json={'channel_handle': '@ciidb'}
)
new_channel = response.json()

# Get metrics with filters
params = {
    'channel_ids': '1,2',
    'start_date': '2024-01-01',
    'end_date': '2024-01-31',
    'limit': 50
}
response = requests.get('http://localhost:3000/api/metrics', params=params)
metrics = response.json()

# Get summary statistics
params = {
    'channel_ids': '1,2',
    'start_date': '2024-01-01',
    'end_date': '2024-01-31'
}
response = requests.get('http://localhost:3000/api/metrics/summary', params=params)
summary = response.json()
```

---

## Notes

- All timestamps are in the format: `YYYY-MM-DD HH:MM:SS`
- The `is_active` field is either 1 (active) or 0 (inactive)
- YouTube API calls are made automatically when adding channels
- Channel handles are automatically resolved to channel IDs using the YouTube API
- Metrics are sorted by date in ascending order by default
- Summary statistics automatically calculate trends when date ranges are provided
- The API uses better-sqlite3 for database operations (synchronous, high-performance)
- All numeric values are returned as appropriate types (integers, floats)

---

## Rate Limiting

The YouTube API has a quota limit of 10,000 units per day. The channel creation endpoint uses the YouTube API to resolve channel handles:

- Channel lookup: 1-101 units per request (1 unit if handle exists, 101 if fallback to search is needed)

Monitor your usage through the YouTube API console: [Google Cloud Console](https://console.developers.google.com/)

If quota is exceeded, the API will return:
```json
{
  "success": false,
  "error": "YouTube API quota exceeded. Please try again later."
}
```
Status code: `503 Service Unavailable`
