# Members-Only Livestream Filter Implementation

## Overview

This document describes the implementation of filtering out members-only and non-public livestreams from data collection to ensure accurate public sentiment tracking.

## Problem

Members-only livestreams have restricted access and artificially low view counts, which skews sentiment analysis. These should not be included in metrics since they don't represent public market sentiment.

## Solution

The implementation filters out videos based on:
1. **Privacy Status**: Must be 'public'
2. **Content Restrictions**: No `hasRestrictions` flag
3. **Membership Keywords**: Checks title/description for membership indicators
4. **Audit Trail**: Stores filtered videos in separate table

## Implementation Details

### 1. Database Schema

Added new table `filtered_videos`:

```sql
CREATE TABLE IF NOT EXISTS filtered_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id TEXT NOT NULL,
  channel_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  title TEXT,
  privacy_status TEXT,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id),
  UNIQUE(video_id, channel_id, detected_at)
);
```

### 2. Model: FilteredVideo.js

New model for tracking filtered videos:
- `createOrUpdate()` - Store filtered video records
- `findByChannelIdAndDate()` - Query filtered videos
- `findByReason()` - Get videos by filter reason
- `getStatsByReason()` - Aggregate statistics by reason

### 3. YouTube API Changes

Updated `youtubeApiClient.js` to request additional video parts:
- Added `status` part for privacy status
- Added `contentDetails` part for restrictions and ratings
- Enhanced verbose logging to show privacy status and restrictions

### 4. Filtering Logic

Added `isPublicLivestream()` method in `liveStreamCollector.js`:

```javascript
isPublicLivestream(video) {
  // Check privacy status
  if (video.status?.privacyStatus !== 'public') {
    return { isPublic: false, reason: 'unlisted|private|non_public' };
  }
  
  // Check content restrictions
  if (video.contentDetails?.hasRestrictions === true) {
    return { isPublic: false, reason: 'has_restrictions' };
  }
  
  // Check for membership keywords
  const memberKeywords = ['member', 'members only', 'membership', 'members-only'];
  if (title/description contains keywords) {
    return { isPublic: false, reason: 'members_only' };
  }
  
  return { isPublic: true };
}
```

### 5. Enhanced Logging

The collector now provides detailed filtering statistics:

```
🚫 FILTERED VIDEOS: 3 video(s) excluded for access restrictions:
   ✗ members only: 2 streams
   ✗ unlisted: 1 stream
```

With verbose mode (`-v` flag):
- Shows each filtered video with reason
- Displays privacy status and restrictions
- Lists membership indicators detected

### 6. Command-Line Option

Added `--include-members-only` flag:

```bash
# Default behavior (filter out members-only)
npm run collect-metrics

# Include members-only content
npm run collect-metrics -- --include-members-only

# Combine with other options
npm run collect-metrics -- --start-date 2024-01-01 --verbose --include-members-only
```

### 7. API Support

Updated POST `/api/collect-metrics` endpoint:

```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "channel_ids": [1, 2],
  "verbose": false,
  "include_members_only": false
}
```

## Filter Reasons

Videos are filtered for the following reasons:

| Reason | Description |
|--------|-------------|
| `members_only` | Title/description contains membership keywords |
| `unlisted` | Privacy status is 'unlisted' |
| `private` | Privacy status is 'private' |
| `non_public` | Privacy status is neither 'public', 'unlisted', nor 'private' |
| `has_restrictions` | Content has restrictions flag set |
| `upcoming` | Livestream scheduled but not started yet |
| `not a livestream` | Regular video, not a livestream |

## Usage Examples

### CLI Collection (Default - Exclude Members-Only)
```bash
npm run collect-metrics -- --start-date 2024-08-01 --end-date 2024-08-31 --verbose
```

**Output:**
```
*** FILTERING OUT MEMBERS-ONLY AND NON-PUBLIC CONTENT ***

Found 10 potential live stream(s).

📊 Filtering and grouping videos...
   Using MAX (peak) aggregation for view counts (not SUM)
   Filtering out members-only and non-public livestreams

✓ Counting video: abc123 - "Public Stream" (5000 views)
🚫 Skipping members_only livestream: def456 - "Members Only Q&A"

🚫 FILTERED VIDEOS: 2 video(s) excluded for access restrictions:
   ✗ members only: 1 stream
   ✗ unlisted: 1 stream

✓ Public: 8 streams
✗ Skipped (members-only): 1 stream
✗ Skipped (unlisted): 1 stream
```

### CLI Collection (Include Members-Only)
```bash
npm run collect-metrics -- --include-members-only
```

**Output:**
```
*** INCLUDING MEMBERS-ONLY CONTENT ***

All livestreams will be included in metrics.
```

### API Collection
```bash
curl -X POST http://localhost:3000/api/collect-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-08-01",
    "end_date": "2024-08-31",
    "include_members_only": false
  }'
```

## Audit Trail

Filtered videos are stored in the `filtered_videos` table for later analysis:

```sql
-- View filtered videos
SELECT * FROM filtered_videos 
WHERE reason = 'members_only' 
ORDER BY detected_at DESC;

-- Get filtering statistics
SELECT reason, COUNT(*) as count 
FROM filtered_videos 
GROUP BY reason;
```

## Benefits

1. **Accurate Metrics**: Only public livestreams counted for sentiment analysis
2. **Data Quality**: Eliminates artificially low view counts from restricted content
3. **Transparency**: Clear logging of what's filtered and why
4. **Flexibility**: Optional flag to include members content when needed
5. **Audit Trail**: Track filtered videos for analysis and debugging
6. **Better Patterns**: AI analysis gets cleaner, more representative data

## Testing Recommendations

1. Test with channels known to have members-only streams (e.g., @ciidb)
2. Verify August 28 case with 2 streams - check if any were members-only
3. Compare view count accuracy before/after filtering
4. Ensure public streams are still collected correctly
5. Verify filtered videos are properly stored in database
6. Test with `--include-members-only` flag to ensure override works

## Configuration

**Default Behavior**: Exclude members-only and non-public content

**To Include Members Content**:
- CLI: `--include-members-only` flag
- API: `"include_members_only": true` in request body

## Future Enhancements

1. Dashboard UI for viewing filtered videos
2. Statistics endpoint for filter reasons
3. Custom keyword configuration
4. Regex pattern matching for advanced filtering
5. Notification when filtering excludes significant amounts of data
