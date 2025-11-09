# Delete Day Feature Documentation

## Overview

The Delete Day feature allows users to permanently delete all YouTube views data for a specific day from the database. This is useful for removing bad data, test data, or data from anomalous days.

## Features

- ✅ Permanently delete all metrics and video records for a specific date
- ✅ User-friendly confirmation dialog with warnings
- ✅ Automatic refresh of charts and data after deletion
- ✅ Success/error feedback messages
- ✅ Data management table showing all available dates

## Architecture

### Backend Components

#### 1. Model Methods

**File:** `src/models/LiveStreamMetrics.js`
```javascript
static deleteByDate(date) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM live_stream_metrics WHERE date = ?');
  return stmt.run(date);
}
```

**File:** `src/models/LiveStreamVideo.js`
```javascript
static deleteByDate(date) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM live_stream_videos WHERE date = ?');
  return stmt.run(date);
}
```

#### 2. API Endpoint

**Endpoint:** `DELETE /api/metrics/date/:date`

**File:** `src/routes/dashboard.js`

**Request:**
- Method: DELETE
- URL: `/api/metrics/date/:date` where `:date` is in YYYY-MM-DD format

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully deleted all data for 2024-01-15",
  "data": {
    "date": "2024-01-15",
    "metrics_deleted": 3,
    "videos_deleted": 5,
    "total_deleted": 8
  }
}
```

**Response (Error - No Data Found):**
```json
{
  "success": false,
  "error": "No data found for the specified date",
  "data": {
    "date": "2024-01-15",
    "metrics_deleted": 0,
    "videos_deleted": 0
  }
}
```

**Response (Error - Invalid Date):**
```json
{
  "success": false,
  "error": "date must be in YYYY-MM-DD format"
}
```

### Frontend Components

#### 1. Data Management Table

**File:** `frontend/public/index.html`

Added a new section that displays all dates with data in a table format:

```html
<section class="data-management-section" id="dataManagementSection">
  <h2>Data Management</h2>
  <p class="section-description">Permanently delete data for specific dates.</p>
  <div class="data-table-container">
    <table class="data-table" id="dataTable">
      <thead>
        <tr>
          <th>Date</th>
          <th>Channels</th>
          <th>Total Peak Views</th>
          <th>Total Streams</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="dataTableBody">
      </tbody>
    </table>
  </div>
</section>
```

#### 2. JavaScript Functions

**File:** `frontend/public/app.js`

**Key Functions:**

1. `updateDataManagementTable(metrics)` - Populates the data table with dates and delete buttons
2. `showDeleteConfirmation(date)` - Shows a modal confirmation dialog
3. `deleteDayData(date)` - Makes the DELETE API request and handles the response

#### 3. Styling

**File:** `frontend/public/styles.css`

Added comprehensive styling for:
- Data management table
- Delete buttons
- Confirmation modal with overlay
- Animations and transitions
- Responsive design for mobile devices

## User Workflow

1. **View Data:** User applies filters and views chart data on the dashboard
2. **Data Management Table:** Below the chart, a data management table appears showing all dates with data
3. **Click Delete:** User clicks the "🗑️ Delete" button next to a specific date
4. **Confirmation Dialog:** A modal appears warning the user about permanent deletion
5. **Confirm Deletion:** User clicks "Delete Permanently" to proceed
6. **Processing:** The button shows "Deleting..." while processing
7. **Success Feedback:** Success message appears and the row fades out
8. **Auto Refresh:** After 1 second, the dashboard automatically refreshes to show updated data

## Security & Data Integrity

### Validation
- ✅ Date format validation (YYYY-MM-DD)
- ✅ No data found returns 404 status
- ✅ Proper error handling at all levels

### User Protection
- ✅ Confirmation dialog prevents accidental deletion
- ✅ Clear warning messages about permanence
- ✅ Shows what will be deleted before confirming
- ✅ Visual feedback during deletion process

### Database Operations
- ✅ Atomic operations - both metrics and videos deleted together
- ✅ Uses prepared statements to prevent SQL injection
- ✅ Returns count of deleted records for verification
- ✅ No cascading deletions to other tables

## Difference from Exclusion Feature

The project also has an "exclusion" feature (`is_excluded` column) which is different:

| Feature | Delete Day | Exclusion |
|---------|------------|-----------|
| **Data Action** | Permanently deletes records | Marks records with `is_excluded = 1` |
| **Reversible** | ❌ No - data is permanently removed | ✅ Yes - can restore with `POST /api/metrics/:id/restore` |
| **Use Case** | Remove bad/test data completely | Temporarily exclude anomalous days from calculations |
| **Database Impact** | Records deleted from database | Records remain in database with flag |

## Testing

### Manual Test

1. Start the server: `npm start`
2. Open browser to `http://localhost:3000`
3. Add a channel and collect some historical data
4. Apply filters to view data
5. Scroll to "Data Management" section
6. Click delete button for a date
7. Confirm deletion in modal
8. Verify data is removed from chart and table

### Programmatic Test

A test was created and passed successfully verifying:
- ✅ Model methods work correctly
- ✅ Data can be deleted by date
- ✅ Only specified date's data is deleted
- ✅ Other dates remain unaffected
- ✅ Both metrics and videos are deleted

## API Examples

### Using cURL

```bash
# Delete all data for January 15, 2024
curl -X DELETE http://localhost:3000/api/metrics/date/2024-01-15
```

### Using JavaScript Fetch

```javascript
const response = await fetch('/api/metrics/date/2024-01-15', {
  method: 'DELETE'
});

const result = await response.json();
if (result.success) {
  console.log(`Deleted ${result.data.total_deleted} records`);
}
```

### Using Postman

1. Method: DELETE
2. URL: `http://localhost:3000/api/metrics/date/2024-01-15`
3. Send Request
4. View response JSON

## Future Enhancements

Possible future improvements:

1. **Bulk Delete:** Delete multiple dates at once
2. **Date Range Delete:** Delete all data between two dates
3. **Soft Delete:** Option to exclude instead of delete
4. **Undo Feature:** Keep deleted data in a temporary table for 24 hours
5. **Audit Log:** Track who deleted what and when
6. **Export Before Delete:** Automatically backup data before deletion

## Troubleshooting

### Issue: Delete button doesn't appear
- **Solution:** Make sure you have applied filters and have data to display

### Issue: Confirmation modal doesn't show
- **Solution:** Check browser console for JavaScript errors

### Issue: Delete fails with 404
- **Solution:** The date may not exist in the database. Check the date format is YYYY-MM-DD

### Issue: Delete succeeds but data still appears
- **Solution:** Try refreshing the page. The auto-refresh should happen automatically after 1 second

## Related Files

- `src/routes/dashboard.js` - API endpoint
- `src/models/LiveStreamMetrics.js` - Metrics model with delete method
- `src/models/LiveStreamVideo.js` - Videos model with delete method
- `frontend/public/index.html` - HTML structure
- `frontend/public/app.js` - JavaScript functionality
- `frontend/public/styles.css` - Styling

## Support

For issues or questions about this feature, please refer to the main project documentation or create an issue in the project repository.
