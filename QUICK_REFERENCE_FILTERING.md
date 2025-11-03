# Members-Only Filter - Quick Reference

## TL;DR

**Default behavior**: Filters out members-only and non-public livestreams ✅  
**Override**: Use `--include-members-only` flag to include everything

## Command Cheat Sheet

```bash
# ✅ Default: Exclude members-only (RECOMMENDED)
npm run collect-metrics

# ❌ Include members-only
npm run collect-metrics -- --include-members-only

# 🔍 See what's filtered (verbose)
npm run collect-metrics -- --verbose

# 📅 Specific date with filtering
npm run collect-metrics -- --start-date 2024-08-28 --verbose
```

## What Gets Filtered?

| Filter Reason | Description | Example |
|--------------|-------------|---------|
| `members_only` | Membership keywords in title/description | "Members Only Q&A" |
| `unlisted` | Not publicly listed | Unlisted streams |
| `private` | Private videos | Private content |
| `has_restrictions` | Platform restrictions | Age-restricted |
| `upcoming` | Scheduled livestreams | Future events |

## Filter Keywords

Content is filtered if title/description contains:
- `member`
- `members only`
- `membership`
- `members-only`

## Privacy Status Checks

✅ **Included**: `privacyStatus: "public"`  
❌ **Excluded**: `privacyStatus: "unlisted"` or `"private"`

## API Quick Reference

### Exclude Members-Only
```json
POST /api/collect-metrics
{
  "start_date": "2024-08-01",
  "end_date": "2024-08-31"
}
```

### Include Members-Only
```json
POST /api/collect-metrics
{
  "start_date": "2024-08-01",
  "end_date": "2024-08-31",
  "include_members_only": true
}
```

## CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--include-members-only` | Include restricted content | `false` |
| `-v, --verbose` | Detailed logging | `false` |
| `-s, --start-date` | Start date (YYYY-MM-DD) | Yesterday |
| `-e, --end-date` | End date (YYYY-MM-DD) | Start date |

## Output Examples

### With Filtering (Default)
```
🚫 FILTERED VIDEOS: 2 video(s) excluded for access restrictions:
   ✗ members only: 1 stream
   ✗ unlisted: 1 stream
```

### Without Filtering
```
*** INCLUDING MEMBERS-ONLY CONTENT ***
All livestreams will be included in metrics.
```

## Database Query

```sql
-- See filtered videos
SELECT * FROM filtered_videos 
ORDER BY detected_at DESC 
LIMIT 10;

-- Count by reason
SELECT reason, COUNT(*) as count 
FROM filtered_videos 
GROUP BY reason;
```

## When to Use Each Mode

### Use Default (Filter Out) ✅
- Production metrics
- Public sentiment analysis
- Dashboard displays
- AI training data
- Channel comparisons

### Use Include Mode ❌
- Testing/debugging
- Channel-specific analysis
- Research purposes
- Historical data migration

## File Changes

| File | Change |
|------|--------|
| `src/models/schema.js` | Added `filtered_videos` table |
| `src/models/FilteredVideo.js` | New model (created) |
| `src/services/youtubeApiClient.js` | Request `status` + `contentDetails` |
| `src/services/liveStreamCollector.js` | Added `isPublicLivestream()` method |
| `src/scripts/collectLiveStreamMetrics.js` | Added `--include-members-only` flag |
| `src/routes/dashboard.js` | API support for `include_members_only` |

## Documentation

- [FILTER_MEMBERS_ONLY_USAGE.md](./FILTER_MEMBERS_ONLY_USAGE.md) - Complete usage guide
- [MEMBERS_ONLY_FILTER_IMPLEMENTATION.md](./MEMBERS_ONLY_FILTER_IMPLEMENTATION.md) - Technical details
