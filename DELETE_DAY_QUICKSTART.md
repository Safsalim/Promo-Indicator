# Delete Day Feature - Quick Start Guide

## For End Users

### How to Delete Data for a Specific Day

1. **Access the Dashboard**
   - Open your browser and go to `http://localhost:3000`

2. **View Your Data**
   - Select one or more channels from the filters
   - Choose a date range
   - Click "Apply Filters"

3. **Navigate to Data Management**
   - Scroll down below the main chart
   - You'll see a "Data Management" section with a table

4. **Delete a Date**
   - Find the date you want to delete in the table
   - Click the red "🗑️ Delete" button in the Actions column

5. **Confirm Deletion**
   - A warning dialog will appear
   - Read the warning carefully
   - Click "Delete Permanently" to proceed or "Cancel" to abort

6. **View Results**
   - A success message will appear
   - The row will fade out
   - The dashboard will automatically refresh with updated data

**⚠️ Warning:** Deletion is permanent and cannot be undone!

---

## For Developers

### API Endpoint

```
DELETE /api/metrics/date/:date
```

**Parameters:**
- `date` (path parameter) - Date in YYYY-MM-DD format

**Example Request:**
```bash
curl -X DELETE http://localhost:3000/api/metrics/date/2024-01-15
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully deleted all data for 2024-01-15",
  "data": {
    "date": "2024-01-15",
    "metrics_deleted": 2,
    "videos_deleted": 3,
    "total_deleted": 5
  }
}
```

**Error Response (404):**
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

**Error Response (400):**
```json
{
  "success": false,
  "error": "date must be in YYYY-MM-DD format"
}
```

### Using in Code

```javascript
// Delete data for a specific date
async function deleteData(date) {
  try {
    const response = await fetch(`/api/metrics/date/${date}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`Deleted ${result.data.total_deleted} records`);
      // Refresh your UI here
    } else {
      console.error('Delete failed:', result.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

// Usage
await deleteData('2024-01-15');
```

### What Gets Deleted

When you delete a date, the following records are permanently removed:

1. **live_stream_metrics table** - All metrics for that date (all channels)
2. **live_stream_videos table** - All video records for that date (all channels)

**Note:** The deletion affects ALL channels for the specified date.

---

## Frequently Asked Questions

### Q: Can I undo a deletion?
**A:** No, deletion is permanent. The data is completely removed from the database. Consider exporting data before deletion if you might need it later.

### Q: Does it delete data for all channels?
**A:** Yes, when you delete a date, it deletes records for ALL channels on that date, not just the currently selected channel.

### Q: What's the difference between Delete and Exclude?
**A:** 
- **Delete:** Permanently removes data from the database (cannot be reversed)
- **Exclude:** Marks data with `is_excluded=1` flag (can be reversed)

Use Exclude for temporary anomalies, Delete for bad/test data you want gone forever.

### Q: Will this affect my historical data analysis?
**A:** Yes, once data is deleted, it won't appear in charts, reports, or calculations. Make sure you really want to remove it.

### Q: Can I delete multiple dates at once?
**A:** Not currently. You need to delete each date individually. This is intentional to prevent accidental bulk deletions.

### Q: What if I accidentally delete the wrong date?
**A:** You'll need to re-collect that data using the "Collect Historical Data" feature on the dashboard. If the YouTube videos are still available, you can recover the data.

---

## Troubleshooting

### Problem: Delete button doesn't appear
**Solution:** Make sure you have data loaded. Apply filters with valid channels and date range.

### Problem: "No data found for the specified date" error
**Solution:** The date doesn't exist in your database. Check your date format is YYYY-MM-DD.

### Problem: Modal doesn't show when clicking Delete
**Solution:** Check browser console for JavaScript errors. Clear browser cache and reload.

### Problem: Data doesn't refresh after deletion
**Solution:** Try manually refreshing the page. The auto-refresh happens after 1 second.

---

## Related Documentation

- `DELETE_DAY_FEATURE.md` - Complete feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `API.md` - Full API reference (if exists)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the full documentation in `DELETE_DAY_FEATURE.md`
3. Contact your system administrator or development team
