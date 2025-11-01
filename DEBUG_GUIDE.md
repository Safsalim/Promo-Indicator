# Debug Guide: Inspecting View Count Data

This guide explains how to use the debug features to inspect and verify live stream view count data in the Promo-Indicator system.

## Problem Context

When view counts don't match expected values (e.g., dashboard shows 540 views but YouTube shows 255 views), you need tools to:

1. **Inspect** what data is currently stored in the database
2. **Identify** which videos were counted and why
3. **Re-collect** data with verbose logging to understand the issue

## Debug Tools

### 1. Debug API Endpoint

**Purpose**: Inspect raw metrics data for a specific channel and date.

**Endpoint**: `GET /api/debug/metrics/:channelId/:date`

**Example**:
```bash
# Check what's stored for channel 1 on Aug 28
curl http://localhost:3000/api/debug/metrics/1/2024-08-28
```

**Response**:
```json
{
  "success": true,
  "data": {
    "date": "2024-08-28",
    "channel_handle": "@ciidb",
    "channel_name": "Channel Name",
    "total_live_stream_views": 540,
    "live_stream_count": 1,
    "note": "Single video counted",
    "videos": [
      {
        "video_id": "abc123xyz",
        "title": "Live Stream Title",
        "url": "https://www.youtube.com/watch?v=abc123xyz",
        "view_count": 540,
        "published_at": "2024-08-28T10:00:00Z",
        "broadcast_type": "none"
      }
    ],
    "raw_metrics_record": {
      "id": 42,
      "channel_id": 1,
      "date": "2024-08-28",
      "total_live_stream_views": 540,
      "live_stream_count": 1,
      "created_at": "2024-08-29 10:00:00"
    }
  }
}
```

**What to Check**:
- `total_live_stream_views`: The aggregated view count
- `live_stream_count`: Number of videos counted (should be 1 for single video)
- `videos[]`: List of videos that contributed to the count
- Check for duplicates or unexpected videos
- Compare `view_count` with actual YouTube values

### 2. Verbose Collection Mode

**Purpose**: See detailed logging of what videos are found and counted during collection.

**Usage**:
```bash
# Re-collect Aug 28 data with verbose logging
node src/scripts/collectLiveStreamMetrics.js \
  --start-date 2024-08-28 \
  --end-date 2024-08-28 \
  --verbose
```

**What You'll See**:
```
============================================================
Live Stream Metrics Collection
============================================================
Date range: 2024-08-28 to 2024-08-28
*** VERBOSE MODE - Detailed logging enabled ***
============================================================

Processing channel ID 1 (UCxxxxxxxxxxxxxxxx)...
Date range: 2024-08-28 to 2024-08-28
Found 1 potential live stream(s).

✓ Found video: abc123xyz
  Title: "Live Stream Title"
  Published: 2024-08-28T10:00:00Z
  Views: 540
  Type: none
  URL: https://www.youtube.com/watch?v=abc123xyz

Processing 1 date(s) with live stream data.
✓ Stored: Date=2024-08-28, Views=540, Count=1
✓ Stored 1 video record(s) for audit trail
```

**What to Check**:
- Number of videos found
- Each video's ID, title, and view count
- Direct YouTube URLs to verify counts
- Look for duplicate video IDs
- Check if wrong videos are included

### 3. SQL Query (Advanced)

**Purpose**: Direct database inspection.

**Usage**:
```bash
# Using sqlite3 command line
sqlite3 database/promo-indicator.db

# Then run:
SELECT * FROM live_stream_metrics 
WHERE channel_id = 1 AND date = '2024-08-28';

SELECT * FROM live_stream_videos 
WHERE channel_id = 1 AND date = '2024-08-28';
```

## Troubleshooting Workflow

### Step 1: Get Channel ID

First, find the database channel ID:

```bash
curl http://localhost:3000/api/channels
```

Look for your channel (e.g., @ciidb) and note the `id` field.

### Step 2: Inspect Current Data

Check what's currently stored:

```bash
curl http://localhost:3000/api/debug/metrics/1/2024-08-28
```

**Look for**:
- Is `live_stream_count` > 1? (Multiple videos were aggregated)
- Are there duplicate video IDs in the `videos` array?
- Do the video URLs match the expected YouTube videos?
- Do the view counts match YouTube?

### Step 3: Verify on YouTube

1. Copy video URLs from the debug response
2. Visit each URL on YouTube
3. Compare view counts

**Example**:
- Debug API shows: 540 views
- YouTube shows: 255 views
- **Discrepancy**: 285 views difference

### Step 4: Re-collect with Verbose Mode

Re-run the collection to see what happens:

```bash
# Re-collect Aug 28 with verbose logging
node src/scripts/collectLiveStreamMetrics.js \
  --start-date 2024-08-28 \
  --end-date 2024-08-28 \
  --verbose
```

**Watch for**:
- "DUPLICATE DETECTED" warnings
- Multiple videos for the same date
- Unexpected video types
- Wrong date ranges

### Step 5: Check for Common Issues

#### Issue: Duplicate Videos
**Symptom**: Same video ID appears multiple times
**Log Message**: `🔁 DUPLICATE DETECTED: Video abc123 - "Title" already counted`
**Solution**: Deduplication fix already implemented in latest code

#### Issue: Multiple Videos Aggregated
**Symptom**: `live_stream_count` > 1 but you expected only one video
**Check**: Look at all videos in the `videos` array - are they all legitimate?

#### Issue: Wrong Date
**Symptom**: Video published on Aug 27 but counted for Aug 28
**Check**: Video's `published_at` field - date grouping uses UTC date

#### Issue: View Count Mismatch
**Symptom**: Debug shows 540 but YouTube shows 255
**Possible causes**:
- API cache lag (wait a few hours)
- Video was counted multiple times (check for duplicates)
- Wrong video was counted (verify video IDs)

## Manual Re-collection

If you find issues with the current data, re-collect it:

```bash
# Standard re-collection
node src/scripts/collectLiveStreamMetrics.js \
  --start-date 2024-08-28 \
  --end-date 2024-08-28

# Or via API
curl -X POST http://localhost:3000/api/collect-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-08-28",
    "end_date": "2024-08-28",
    "channel_ids": [1],
    "verbose": true
  }'
```

**Note**: Re-collection will update existing records, not create duplicates (uses UPSERT).

## Best Practices

### Daily Verification
```bash
# Check yesterday's collection
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)

curl http://localhost:3000/api/debug/metrics/1/$YESTERDAY
```

### Batch Verification
```bash
# Check multiple dates
for date in 2024-08-{25..30}; do
  echo "Checking $date..."
  curl http://localhost:3000/api/debug/metrics/1/$date
  echo ""
done
```

### Compare with YouTube
1. Use debug endpoint to get video URLs
2. Create a spreadsheet with:
   - Date
   - Video ID
   - Debug API view count
   - YouTube actual view count
   - Difference
3. Identify patterns in discrepancies

## FAQs

**Q: Why does the debug endpoint show different data than /metrics?**
A: They should match. The debug endpoint just provides more detail.

**Q: Can I use verbose mode in production?**
A: Yes, but it produces more logs. Use only when debugging issues.

**Q: Will re-collecting overwrite existing data?**
A: Yes, it will update the metrics and video records for that date.

**Q: How far back can I inspect data?**
A: As far back as you have data in the database.

**Q: Can I delete bad data?**
A: Yes, use SQL:
```sql
DELETE FROM live_stream_metrics WHERE channel_id = 1 AND date = '2024-08-28';
DELETE FROM live_stream_videos WHERE channel_id = 1 AND date = '2024-08-28';
```
Then re-collect.

## Getting Help

If you encounter issues:

1. **Check logs**: Look for error messages or warnings
2. **Verify API key**: Ensure YouTube API key is valid
3. **Check quota**: Verify you haven't exceeded YouTube API quota
4. **Review documentation**: See DEDUPLICATION_FIX_SUMMARY.md for context
5. **Create issue**: Provide debug endpoint output and verbose logs

## Related Documentation

- [DASHBOARD_API.md](./DASHBOARD_API.md) - API endpoint documentation
- [COLLECTION_SERVICE.md](./COLLECTION_SERVICE.md) - Collection service details
- [DEDUPLICATION_FIX_SUMMARY.md](./DEDUPLICATION_FIX_SUMMARY.md) - Deduplication fix overview
- [test_deduplication.md](./test_deduplication.md) - Testing guide for deduplication
