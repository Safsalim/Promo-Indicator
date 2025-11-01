# Peak View Recalculation Implementation

## Summary

This implementation addresses the need to re-collect historical data with the new peak (MAX) view aggregation logic, replacing old SUM values that were stored before the aggregation fix.

## Problem Addressed

- Existing database entries contained SUM values (e.g., Aug 28 showing 540 views = sum of 2 streams)
- The code was fixed to use MAX aggregation for new collections
- Historical data needed to be recalculated to use peak values (e.g., 540 → 285 for the highest-viewed stream)

## Solution Implemented

### 1. NPM Script for Recalculation

**File:** `package.json`

Added `recalculate-metrics` script as an alias for `collect-metrics`:

```json
"recalculate-metrics": "node src/scripts/collectLiveStreamMetrics.js"
```

**Usage:**
```bash
npm run recalculate-metrics -- --start-date 2024-08-01 --end-date 2024-11-01 --verbose
```

### 2. Enhanced Logging with Before/After Values

**File:** `src/services/liveStreamCollector.js`

**Changes:**

a) Added confirmation message about MAX aggregation:
```javascript
if (this.verbose) {
  this.logger.log('📊 Using MAX (peak) aggregation for view counts (not SUM)');
}
```

b) Enhanced collection logic to show before/after values:
```javascript
// Check for existing data
const existingMetric = LiveStreamMetrics.findByChannelIdAndDate(channelDbId, date);
const isUpdate = !!existingMetric;
const oldViews = existingMetric ? existingMetric.total_live_stream_views : null;

// After saving, show changes
if (isUpdate && oldViews !== data.peakViews) {
  this.logger.log(`🔄 Updated: Date=${date}`);
  this.logger.log(`   Views: ${oldViews} → ${data.peakViews} (${data.peakViews > oldViews ? '+' : ''}${data.peakViews - oldViews})`);
}
```

**Example Output:**
```
📊 Using MAX (peak) aggregation for view counts (not SUM)
✓ Counting video: abc123 - "Stream 1" (255 views)
✓ Counting video: def456 - "Stream 2" (285 views)
🔄 Updated: Date=2024-08-28
   Views: 540 → 285 (-255)
   Streams: 2 → 2
✓ Stored 2 video record(s) for audit trail
```

### 3. Dashboard UI - Recalculate Data Section

**File:** `frontend/public/index.html`

Added a new section after the "Collect Historical Data" section:

```html
<!-- Recalculate Data Section -->
<section class="collection-section recalculate-section">
  <h2>Recalculate Data with Peak Aggregation</h2>
  <div class="collection-container">
    <p class="collection-desc">Re-process existing data to use peak (MAX) view counts...</p>
    <div class="collection-form">
      <input type="date" id="recalcStartDate">
      <input type="date" id="recalcEndDate">
      <button id="recalculateDataBtn" class="btn-secondary">
        Recalculate Data
      </button>
    </div>
    <div id="recalculationFeedback" class="feedback-message"></div>
    <div class="recalc-info">
      ℹ️ Note: This will re-fetch data from YouTube and recalculate...
    </div>
  </div>
</section>
```

**Features:**
- Date range picker for recalculation
- Warning color scheme (orange) to distinguish from regular collection
- Info box explaining what the recalculation does
- Confirmation dialog before proceeding

### 4. CSS Styling for Recalculate Section

**File:** `frontend/public/styles.css`

Added styles:

```css
.recalculate-section {
  border: 2px solid var(--warning-color);
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%);
}

.btn-secondary {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.recalc-info {
  margin-top: 15px;
  padding: 12px 16px;
  background-color: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  color: #92400e;
}
```

### 5. JavaScript Functionality

**File:** `frontend/public/app.js`

Added functions:

a) **`recalculateData()`** - Handles the recalculation button click:
   - Validates date inputs
   - Shows confirmation dialog
   - Calls `/api/collect-metrics` with `verbose: true`
   - Displays success/error feedback
   - Refreshes dashboard after completion

b) **`initializeRecalcDates()`** - Initializes date fields with reasonable defaults (last 90 days)

c) Event listener setup in `setupEventListeners()`:
```javascript
document.getElementById('recalculateDataBtn').addEventListener('click', recalculateData);
```

### 6. Documentation Updates

**Files Updated:**

a) **`PEAK_VIEWS_MIGRATION.md`**
   - Added UI-based recalculation instructions as Option A (Recommended)
   - Enhanced CLI instructions with verbose flag examples
   - Added example output showing before/after values

b) **`README.md`**
   - Added "Recalculate existing data with peak aggregation" section
   - Documented the `npm run recalculate-metrics` command
   - Explained the verbose flag and its output
   - Cross-referenced PEAK_VIEWS_MIGRATION.md

## Testing

### Manual Testing Steps

1. **Test CLI Recalculation:**
```bash
npm run recalculate-metrics -- --start-date 2024-08-28 --end-date 2024-08-28 --verbose
```
Expected: Shows MAX aggregation message and before/after values

2. **Test UI Recalculation:**
   - Open dashboard at http://localhost:3000
   - Navigate to "Recalculate Data with Peak Aggregation" section
   - Select date range (e.g., 2024-08-01 to 2024-11-01)
   - Click "Recalculate Data"
   - Confirm the dialog
   - Verify success message appears
   - Check that data refreshes on the dashboard

3. **Verify Before/After Logging:**
   - Run recalculation on a date with known old SUM values
   - Verify console shows "🔄 Updated" with view count changes
   - Example: 540 → 285 for a date with 2 streams

4. **Verify MAX Aggregation:**
   - Run with --verbose flag
   - Confirm "📊 Using MAX (peak) aggregation" message appears
   - Verify multiple videos on same day show individual counts
   - Confirm only the peak value is stored

## Expected Outcomes

1. ✅ Users can recalculate data via CLI or UI
2. ✅ Before/after values are logged for transparency
3. ✅ Days with multiple streams now show peak value, not sum
4. ✅ Confirmation that MAX aggregation is being used
5. ✅ Aug 28 example: 540 views → ~285 views (peak)
6. ✅ Stream count remains accurate (2 streams)
7. ✅ RSI calculations now use correct peak values

## Benefits

- **User-Friendly**: Dashboard button makes recalculation easy
- **Transparent**: Before/after logging shows exactly what changed
- **Validated**: Confirmation dialog prevents accidental recalculation
- **Documented**: Clear instructions in README and migration guide
- **Flexible**: Can recalculate any date range via UI or CLI

## Files Modified

1. `package.json` - Added recalculate-metrics script
2. `src/services/liveStreamCollector.js` - Enhanced logging
3. `frontend/public/index.html` - Added recalculate UI section
4. `frontend/public/styles.css` - Added styling for recalculate section
5. `frontend/public/app.js` - Added recalculate functionality
6. `PEAK_VIEWS_MIGRATION.md` - Updated with UI and CLI instructions
7. `README.md` - Added recalculation documentation

## Related Documentation

- [PEAK_VIEWS_MIGRATION.md](./PEAK_VIEWS_MIGRATION.md) - Full migration guide
- [README.md](./README.md) - Main documentation with usage examples
- [DASHBOARD_API.md](./DASHBOARD_API.md) - API endpoint documentation
