# Implementation Notes: Debug Metrics & Verbose Collection

## Summary

This implementation adds debug and inspection capabilities to help diagnose view count discrepancies, specifically the Aug 28 issue where 540 views were showing instead of 255 views.

## Changes Made

### 1. Debug API Endpoint ✅

**File**: `src/routes/dashboard.js`

**Added**: `GET /api/debug/metrics/:channelId/:date`

**Features**:
- Inspect raw database entry for specific channel/date
- Shows aggregated metrics (total views, stream count)
- Lists individual videos that contributed to metrics
- Includes raw database record for full transparency
- Helpful note explaining if multiple videos were aggregated

**Response Format**:
```json
{
  "success": true,
  "data": {
    "date": "2024-08-28",
    "channel_handle": "@ciidb",
    "total_live_stream_views": 540,
    "live_stream_count": 1,
    "note": "Single video counted",
    "videos": [...],
    "raw_metrics_record": {...}
  }
}
```

**Use Case**: Quickly inspect what data is stored for Aug 28 without waiting for fixes.

### 2. Verbose Logging Flag ✅

**Files Modified**:
- `src/scripts/collectLiveStreamMetrics.js`
- `src/services/liveStreamCollector.js`

**Added**: `--verbose` / `-v` command-line flag

**Features**:
- Detailed logging of each video found during collection
- Shows video ID, title, published date, views, type, and URL
- Helps identify exactly what videos are being counted
- Conditional logging (only when verbose mode is enabled)

**Verbose Output Example**:
```
✓ Found video: abc123xyz
  Title: "Live Stream Title"
  Published: 2024-08-28T10:00:00Z
  Views: 540
  Type: none
  URL: https://www.youtube.com/watch?v=abc123xyz
```

**Usage**:
```bash
node src/scripts/collectLiveStreamMetrics.js \
  --start-date 2024-08-28 \
  --end-date 2024-08-28 \
  --verbose
```

**API Support**: Added `verbose` parameter to `POST /api/collect-metrics` endpoint

### 3. Documentation ✅

**Files Created/Updated**:

#### DEBUG_GUIDE.md (NEW)
Comprehensive guide for debugging view count issues:
- Step-by-step troubleshooting workflow
- How to use debug endpoint
- How to use verbose mode
- Common issues and solutions
- FAQs and best practices

#### DASHBOARD_API.md (UPDATED)
Added complete documentation for the debug endpoint:
- Path parameters and validation
- Response format and field descriptions
- Example requests and responses
- Error handling examples
- Use cases

#### COLLECTION_SERVICE.md (UPDATED)
Added verbose mode documentation:
- Command-line option description
- Usage examples
- Sample verbose output
- When to use verbose mode
- Benefits of verbose logging

### 4. Code Quality

**Error Handling**:
- Validates channel ID (must be positive integer)
- Validates date format (YYYY-MM-DD)
- Handles channel not found (404)
- Handles no metrics found (404 with helpful data)
- Provides meaningful error messages

**Backwards Compatibility**:
- Verbose mode is optional (defaults to false)
- Existing collection behavior unchanged when not verbose
- Debug endpoint doesn't affect existing endpoints

**Performance**:
- Debug endpoint uses existing database queries
- No new indexes needed
- Verbose mode only adds logging, no extra API calls

## Testing

### Manual Testing Checklist

#### Debug Endpoint
- [ ] Test with valid channel ID and date
- [ ] Test with invalid channel ID
- [ ] Test with invalid date format
- [ ] Test with non-existent channel
- [ ] Test with date that has no metrics
- [ ] Verify video list is populated
- [ ] Verify raw record is included

#### Verbose Mode
- [ ] Run collection with --verbose flag
- [ ] Verify detailed video logs appear
- [ ] Run without --verbose flag
- [ ] Verify standard logs still work
- [ ] Test with multiple videos for same date
- [ ] Test with API via POST /api/collect-metrics

#### Documentation
- [ ] README examples are accurate
- [ ] API documentation matches actual responses
- [ ] Debug guide examples work

### Example Test Commands

```bash
# Test debug endpoint
curl http://localhost:3000/api/debug/metrics/1/2024-08-28

# Test verbose collection
node src/scripts/collectLiveStreamMetrics.js -s 2024-08-28 -e 2024-08-28 -v

# Test API verbose mode
curl -X POST http://localhost:3000/api/collect-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-08-28",
    "end_date": "2024-08-28",
    "channel_ids": [1],
    "verbose": true
  }'
```

## Files Changed

### Modified Files (5)
1. `src/routes/dashboard.js` - Added debug endpoint
2. `src/scripts/collectLiveStreamMetrics.js` - Added verbose flag
3. `src/services/liveStreamCollector.js` - Added verbose logging
4. `DASHBOARD_API.md` - Documented debug endpoint
5. `COLLECTION_SERVICE.md` - Documented verbose mode

### New Files (2)
1. `DEBUG_GUIDE.md` - Complete debugging guide
2. `IMPLEMENTATION_NOTES.md` - This file

## Expected Outcome

With these changes, users can now:

1. **Immediately inspect** what data is stored for Aug 28:
   ```bash
   curl http://localhost:3000/api/debug/metrics/1/2024-08-28
   ```

2. **See exactly** what videos are found and counted:
   ```bash
   node src/scripts/collectLiveStreamMetrics.js -s 2024-08-28 -e 2024-08-28 -v
   ```

3. **Identify issues** such as:
   - Duplicate videos
   - Wrong videos being counted
   - Incorrect date grouping
   - View count discrepancies

4. **Verify fixes** by re-collecting data and comparing results

## Integration with Existing Features

This implementation complements the existing deduplication fix (see `DEDUPLICATION_FIX_SUMMARY.md`):

- **Deduplication Fix**: Prevents duplicates during collection
- **Debug Endpoint**: Inspects historical data to identify past duplicates
- **Verbose Mode**: Confirms deduplication is working correctly
- **Video Audit Trail**: Provides evidence of what was counted

Together, these features provide complete visibility into the metrics collection process.

## Next Steps (Future Enhancements)

Not included in this implementation but could be added later:

1. **Dashboard UI Debug Button**: Add "Debug" button next to each data point on the graph
2. **Batch Debug Endpoint**: Check multiple dates at once
3. **Comparison Tool**: Automated YouTube comparison
4. **Historical Duplicate Scanner**: Find duplicates in historical data
5. **Debug API Filtering**: Filter videos by type, title, etc.

## Rollback

If issues occur, rollback is safe:

```bash
git checkout main
```

All changes are additive:
- New endpoint doesn't affect existing ones
- Verbose flag is optional
- Documentation changes don't affect code

## Related Issues

This implementation addresses:
- Aug 28 view count discrepancy (540 vs 255)
- Need for immediate data inspection
- Lack of visibility into collection process
- Difficulty debugging data accuracy issues
