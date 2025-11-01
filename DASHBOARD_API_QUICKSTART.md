# Dashboard API Quick Start Guide

This guide will help you quickly get started with the Promo-Indicator Dashboard API.

## Prerequisites

1. Server is running on `http://localhost:3000`
2. Database is initialized with `npm run init-db`
3. YouTube API key is configured in `.env`

## Quick Start Examples

### 1. List All Channels

Get all tracked channels:

```bash
curl http://localhost:3000/api/channels
```

**Expected Response:**
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

### 2. Add a New Channel

Add a channel by its handle (YouTube API will be called to resolve the channel):

```bash
curl -X POST http://localhost:3000/api/channels \
  -H "Content-Type: application/json" \
  -d '{"channel_handle": "@channelhandle"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "channel_handle": "@channelhandle",
    "channel_id": "UCyyyyyyyyyyyyyyyyyy",
    "channel_name": "Channel Name",
    "added_date": "2024-01-01 13:00:00",
    "is_active": 1
  }
}
```

### 3. Get All Metrics

Retrieve all live stream metrics:

```bash
curl http://localhost:3000/api/metrics
```

### 4. Get Filtered Metrics

Filter metrics by channel and date range:

```bash
curl "http://localhost:3000/api/metrics?channel_ids=1,2&start_date=2024-01-01&end_date=2024-01-31&limit=50"
```

### 5. Get Summary Statistics

Get aggregated statistics:

```bash
curl http://localhost:3000/api/metrics/summary
```

**Expected Response:**
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
    "trend": null,
    "channel_breakdown": null
  }
}
```

### 6. Get Summary with Trend Analysis

Add date range to get trend information:

```bash
curl "http://localhost:3000/api/metrics/summary?start_date=2024-01-01&end_date=2024-01-31"
```

**Response includes trend:**
```json
{
  "success": true,
  "data": {
    "summary": { ... },
    "trend": {
      "direction": "up",
      "percentage": "25.50",
      "first_period_avg": 4000,
      "second_period_avg": 5020
    },
    "channel_breakdown": null
  }
}
```

### 7. Get Summary with Channel Breakdown

Filter by specific channels to get per-channel breakdown:

```bash
curl "http://localhost:3000/api/metrics/summary?channel_ids=1,2"
```

**Response includes breakdown:**
```json
{
  "success": true,
  "data": {
    "summary": { ... },
    "trend": null,
    "channel_breakdown": [
      {
        "id": 1,
        "channel_handle": "@ciidb",
        "channel_name": "Channel Name",
        "record_count": 15,
        "total_views": 75000,
        "avg_views": 5000,
        "total_streams": 22
      }
    ]
  }
}
```

### 8. Get Complete Summary (Trend + Breakdown)

Combine date range and channel filters:

```bash
curl "http://localhost:3000/api/metrics/summary?channel_ids=1,2&start_date=2024-01-01&end_date=2024-01-31"
```

## Common Use Cases

### Dashboard Overview

Get overall statistics for the main dashboard:

```bash
curl http://localhost:3000/api/metrics/summary
```

### Channel Performance Comparison

Compare multiple channels over a time period:

```bash
curl "http://localhost:3000/api/metrics/summary?channel_ids=1,2,3&start_date=2024-01-01&end_date=2024-01-31"
```

### Recent Activity

Get the last 10 metric records:

```bash
curl "http://localhost:3000/api/metrics?limit=10"
```

### Weekly Report

Get metrics for the past week:

```bash
curl "http://localhost:3000/api/metrics?start_date=2024-01-15&end_date=2024-01-21"
```

### Single Channel Deep Dive

Get all data for one channel with trend analysis:

```bash
# Get metrics
curl "http://localhost:3000/api/metrics?channel_ids=1"

# Get summary
curl "http://localhost:3000/api/metrics/summary?channel_ids=1&start_date=2024-01-01&end_date=2024-01-31"
```

## Error Handling

The API returns consistent error responses:

### Missing Required Field
```json
{
  "success": false,
  "error": "channel_handle is required"
}
```

### Invalid Date Format
```json
{
  "success": false,
  "error": "start_date must be in YYYY-MM-DD format"
}
```

### Channel Not Found
```json
{
  "success": false,
  "error": "Channel not found: @invalidhandle"
}
```

### Duplicate Channel
```json
{
  "success": false,
  "error": "Channel with this handle already exists",
  "data": { /* existing channel */ }
}
```

## JavaScript Example

```javascript
// Fetch all channels
async function getChannels() {
  const response = await fetch('http://localhost:3000/api/channels');
  const data = await response.json();
  
  if (data.success) {
    console.log('Channels:', data.data);
  } else {
    console.error('Error:', data.error);
  }
}

// Add a new channel
async function addChannel(handle) {
  const response = await fetch('http://localhost:3000/api/channels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel_handle: handle })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Channel added:', data.data);
  } else {
    console.error('Error:', data.error);
  }
}

// Get filtered metrics
async function getMetrics(channelIds, startDate, endDate) {
  const params = new URLSearchParams({
    channel_ids: channelIds.join(','),
    start_date: startDate,
    end_date: endDate
  });
  
  const response = await fetch(`http://localhost:3000/api/metrics?${params}`);
  const data = await response.json();
  
  if (data.success) {
    console.log('Metrics:', data.data);
  } else {
    console.error('Error:', data.error);
  }
}

// Get summary with trend and breakdown
async function getSummary(channelIds, startDate, endDate) {
  const params = new URLSearchParams({
    channel_ids: channelIds.join(','),
    start_date: startDate,
    end_date: endDate
  });
  
  const response = await fetch(`http://localhost:3000/api/metrics/summary?${params}`);
  const data = await response.json();
  
  if (data.success) {
    console.log('Summary:', data.data.summary);
    console.log('Trend:', data.data.trend);
    console.log('Breakdown:', data.data.channel_breakdown);
  } else {
    console.error('Error:', data.error);
  }
}

// Usage examples
getChannels();
addChannel('@newchannel');
getMetrics([1, 2], '2024-01-01', '2024-01-31');
getSummary([1, 2], '2024-01-01', '2024-01-31');
```

## Testing the API

### Unit Tests
Run database and business logic tests:
```bash
node src/tests/dashboardApi.test.js
```

### Integration Tests
Run full HTTP endpoint tests (requires running server):
```bash
npm start  # In one terminal
node src/tests/dashboardApi.integration.test.js  # In another terminal
```

## Next Steps

1. **Collect Metrics Data**: Use `npm run collect-metrics` to gather live stream data
2. **Add Channels**: Use the POST `/api/channels` endpoint to add channels to track
3. **Build Frontend**: Use these endpoints to build a web dashboard
4. **Schedule Collection**: Set up cron jobs for automated data collection

## Complete Workflow Example

```bash
# 1. Start the server
npm start

# 2. Add a channel
curl -X POST http://localhost:3000/api/channels \
  -H "Content-Type: application/json" \
  -d '{"channel_handle": "@ciidb"}'

# 3. Collect metrics for that channel
npm run collect-metrics

# 4. View the metrics
curl "http://localhost:3000/api/metrics?channel_ids=1"

# 5. Get summary statistics
curl "http://localhost:3000/api/metrics/summary?channel_ids=1&start_date=2024-01-01&end_date=2024-01-31"
```

## Additional Resources

- Full API Documentation: [DASHBOARD_API.md](./DASHBOARD_API.md)
- Database Schema: [DATABASE.md](./DATABASE.md)
- YouTube API Integration: [YOUTUBE_API.md](./YOUTUBE_API.md)
- Main README: [README.md](./README.md)
