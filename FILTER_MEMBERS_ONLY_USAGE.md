# Filter Members-Only Livestreams - Usage Guide

## Quick Start

By default, the metrics collection now **filters out members-only and non-public livestreams** to ensure accurate public sentiment tracking.

## What Gets Filtered?

The following types of videos are automatically excluded from metrics collection:

### 1. Non-Public Videos
- **Unlisted**: Not listed in search results or public channel page
- **Private**: Only visible to specific users
- **Non-public status**: Any other non-public privacy setting

### 2. Restricted Content
- Videos with the `hasRestrictions` flag set in YouTube API
- Content with platform-imposed restrictions

### 3. Members-Only Content
Videos with membership indicators in title or description:
- "member"
- "members only"
- "membership"
- "members-only"

### 4. Other Exclusions
- **Upcoming**: Scheduled but not yet started
- **Regular videos**: Non-livestream content

## Usage

### Default Behavior (Recommended)

By default, members-only content is **excluded**:

```bash
# Collect yesterday's metrics (excludes members-only)
npm run collect-metrics

# Collect specific date range (excludes members-only)
npm run collect-metrics -- --start-date 2024-08-01 --end-date 2024-08-31

# With verbose logging to see what's filtered
npm run collect-metrics -- --start-date 2024-08-28 --verbose
```

### Include Members-Only Content

To include all content including members-only livestreams:

```bash
# Include members-only content
npm run collect-metrics -- --include-members-only

# Combine with date range
npm run collect-metrics -- --start-date 2024-08-01 --end-date 2024-08-31 --include-members-only
```

## Understanding the Output

### Normal Mode

```bash
$ npm run collect-metrics
```

Output:
```
============================================================
Live Stream Metrics Collection
============================================================
Date range: 2024-11-02 to 2024-11-02
*** FILTERING OUT MEMBERS-ONLY AND NON-PUBLIC CONTENT ***
============================================================
Processing 1 active channel(s)...

Processing channel ID 1 (UCxxxx)...
Found 5 potential live stream(s).

✓ Counting video: abc123 - "Bitcoin Analysis" (5000 views)
✓ Counting video: def456 - "Market Update" (3500 views)

🚫 FILTERED VIDEOS: 2 video(s) excluded for access restrictions:
   ✗ members only: 1 stream
   ✗ unlisted: 1 stream

Processing 1 date(s) with live stream data.
✓ Stored: Date=2024-11-02, Peak Views=5000, Count=2
✓ Stored 2 video record(s) for audit trail

============================================================
Collection Summary
============================================================
Total channels: 1
Successful: 1
Failed: 0
============================================================
```

### Verbose Mode

```bash
$ npm run collect-metrics -- --verbose
```

Shows detailed information about each video:
```
📊 Filtering and grouping videos...
   Using MAX (peak) aggregation for view counts (not SUM)
   Filtering out members-only and non-public livestreams

✓ Found video: abc123
  Title: "Bitcoin Analysis"
  Published: 2024-11-02T10:00:00Z
  Views: 5000
  Type: none
  URL: https://www.youtube.com/watch?v=abc123

🚫 Skipping members_only livestream: xyz789 - "Members Only Q&A"

🚫 FILTERED VIDEOS: 1 video(s) excluded for access restrictions:
   ✗ members only: 1 stream
   - xyz789: "Members Only Q&A" (members_only)
```

### With Members-Only Included

```bash
$ npm run collect-metrics -- --include-members-only
```

Output:
```
============================================================
Live Stream Metrics Collection
============================================================
Date range: 2024-11-02 to 2024-11-02
*** INCLUDING MEMBERS-ONLY CONTENT ***
============================================================
Processing 1 active channel(s)...

All livestreams will be included in metrics regardless of access restrictions.
```

## API Usage

### POST /api/collect-metrics

#### Exclude Members-Only (Default)

```bash
curl -X POST http://localhost:3000/api/collect-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-08-01",
    "end_date": "2024-08-31",
    "verbose": false
  }'
```

#### Include Members-Only

```bash
curl -X POST http://localhost:3000/api/collect-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-08-01",
    "end_date": "2024-08-31",
    "include_members_only": true,
    "verbose": false
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "total_channels": 1,
    "successful": 1,
    "failed": 0,
    "details": [
      {
        "channelId": 1,
        "channelHandle": "@example",
        "channelName": "Example Channel",
        "success": true,
        "message": "Collection completed",
        "processed": 5
      }
    ]
  },
  "message": "Collection completed successfully"
}
```

## Viewing Filtered Videos

Filtered videos are stored in the `filtered_videos` table for audit purposes.

### Query Filtered Videos

```sql
-- View all filtered videos
SELECT * FROM filtered_videos 
ORDER BY detected_at DESC 
LIMIT 20;

-- Count by reason
SELECT reason, COUNT(*) as count 
FROM filtered_videos 
GROUP BY reason 
ORDER BY count DESC;

-- Find members-only videos
SELECT * FROM filtered_videos 
WHERE reason = 'members_only' 
ORDER BY detected_at DESC;

-- Get filtered videos for specific date
SELECT fv.*, c.channel_name 
FROM filtered_videos fv
JOIN channels c ON fv.channel_id = c.id
WHERE DATE(fv.detected_at) = '2024-08-28';
```

## When to Include Members-Only Content

You should use `--include-members-only` when:

1. **Analyzing channel-specific patterns**: Understanding all content types
2. **Comparing restricted vs public engagement**: Research purposes
3. **Testing/debugging**: Verifying all livestreams are detected
4. **Historical data migration**: Preserving complete historical record

## When to Exclude Members-Only Content (Default)

Default filtering is recommended for:

1. **Public sentiment analysis**: Tracking market sentiment from public data
2. **View count accuracy**: Avoiding artificially low restricted content views
3. **AI pattern detection**: Training on representative public data
4. **Comparing channels**: Fair comparison using only public metrics
5. **Production metrics**: Regular monitoring and dashboards

## Impact on Metrics

### Before Filtering (with members-only)
```
Date: 2024-08-28
Streams: 2
Total Views: 540 (285 public + 255 members-only)
```

### After Filtering (public only)
```
Date: 2024-08-28
Streams: 1
Peak Views: 285 (public only)
```

**Result**: More accurate representation of public market sentiment.

## Best Practices

1. **Use default filtering** for production metrics collection
2. **Enable verbose mode** when investigating specific dates or channels
3. **Review filtered videos** periodically to ensure filtering is working correctly
4. **Document** when using `--include-members-only` for transparency
5. **Compare results** with and without filtering to understand impact

## Troubleshooting

### No videos collected after filtering

If filtering excludes all videos:
1. Check if channel primarily has members-only content
2. Review filtered_videos table for reasons
3. Use `--verbose` to see what's being filtered
4. Verify videos are actually public livestreams

### Unexpected filtering

If public videos are being filtered:
1. Check video titles/descriptions for membership keywords
2. Verify privacy status in YouTube Studio
3. Use `--verbose` to see why videos are filtered
4. Review the `isPublicLivestream()` logic if needed

## Examples

### Test Specific Date (August 28, 2024)
```bash
# See what happened on August 28
npm run collect-metrics -- --start-date 2024-08-28 --end-date 2024-08-28 --verbose

# Compare with members-only included
npm run collect-metrics -- --start-date 2024-08-28 --end-date 2024-08-28 --include-members-only --verbose
```

### Collect Historical Data
```bash
# Collect last 90 days (public only)
npm run collect-metrics -- --start-date 2024-08-01 --end-date 2024-10-31

# Verify what was filtered
# Then check database:
# SELECT reason, COUNT(*) FROM filtered_videos GROUP BY reason;
```

### API Collection with Filtering
```javascript
// Fetch public metrics
const response = await fetch('http://localhost:3000/api/collect-metrics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    start_date: '2024-08-01',
    end_date: '2024-08-31',
    include_members_only: false,
    verbose: true
  })
});

const result = await response.json();
console.log('Collection results:', result.data);
```

## Additional Resources

- [MEMBERS_ONLY_FILTER_IMPLEMENTATION.md](./MEMBERS_ONLY_FILTER_IMPLEMENTATION.md) - Technical details
- [DATABASE.md](./DATABASE.md) - Database schema documentation
- [COLLECTION_SERVICE.md](./COLLECTION_SERVICE.md) - Collection service guide
