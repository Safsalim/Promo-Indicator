# Overlay Chart Feature

## Overview
The Overlay Chart feature allows users to view all sentiment indicators (YouTube Views, BTC Price, and Fear & Greed Index) on a single chart for easy visual comparison and correlation analysis.

## Features

### 1. View Toggle
- **Stacked View** (Default): Shows all charts separately stacked vertically
- **Overlay View**: Combines all metrics on one chart with multiple Y-axes

### 2. Multiple Y-Axes Configuration
The overlay chart uses three Y-axes to accommodate different scales:

- **Left Y-Axis 1**: YouTube Views (Blue #3B82F6)
  - Scale: 0 to max views (with K/M formatting)
  - Shows peak daily view counts

- **Left Y-Axis 2** (Offset): Fear & Greed Index / RSI (Orange #F59E0B / Purple #A855F7)
  - Scale: 0-100
  - Shares axis between F&G Index and optional RSI overlay
  - F&G line color changes based on value (red for fear, green for greed)

- **Right Y-Axis**: BTC Price (Green #10B981)
  - Scale: Auto-scaled to BTC price range
  - Shows daily closing prices with $ formatting

### 3. Normalization Option
- **Checkbox**: "Normalize to 0-100 scale"
- When enabled, all metrics are converted to a percentage scale (0-100)
- Formula: `(value - min) / (max - min) * 100`
- Useful for comparing relative movements rather than absolute values
- All metrics share a single Y-axis when normalized

### 4. RSI Overlay Option
- **Checkbox**: "Show RSI overlay"
- Adds RSI as a 4th line (purple, dashed) on the chart
- Uses the same 0-100 scale as Fear & Greed Index
- Allows direct comparison of YouTube sentiment (RSI) vs Market sentiment (F&G)
- RSI displays for the first selected channel

### 5. Interactive Features
- **Synchronized Tooltips**: Hovering over any point shows all metrics for that date
- **Responsive Legend**: Shows all active metrics with color coding
- **Zoom & Pan**: Standard Chart.js interactions available
- **Mobile Responsive**: Layout adjusts for smaller screens

## Usage

### Switching Views
1. Use the view toggle buttons at the top of the dashboard
2. Click "Overlay View" to see combined chart
3. Click "Stacked View" to return to separate charts

### Analyzing Correlations
1. Load data using the filters section (select channels and date range)
2. Click "Apply Filters" to load data
3. Switch to "Overlay View"
4. Look for:
   - **Leading indicators**: Does YouTube views spike before BTC price?
   - **Divergences**: High views but low F&G might indicate fear of missing out
   - **Confirmations**: All metrics moving in same direction suggests strong trend

### Using Normalization
1. Enable "Normalize to 0-100 scale" checkbox
2. All metrics now show percentage of their range
3. Easier to spot relative changes and timing differences
4. Good for:
   - Comparing trends when absolute values differ greatly
   - Finding correlation patterns
   - Identifying which metric leads or lags

### Adding RSI
1. Enable "Show RSI overlay" checkbox
2. Purple dashed line appears (if RSI data exists)
3. Compare YouTube RSI vs Market F&G directly
4. Both use 0-100 scale:
   - Above 70: Overbought/Heated
   - Below 30: Oversold/Cooling
   - 30-70: Neutral zone

## Technical Implementation

### Files Modified
- `frontend/public/index.html`: Added view toggle UI and overlay chart section
- `frontend/public/styles.css`: Added styling for view toggle and overlay controls
- `frontend/public/app.js`: Added overlay chart variable and event listeners
- `frontend/public/overlay-functions.js`: New file with overlay chart logic

### Chart.js Configuration
- **Chart Type**: Line chart
- **Aspect Ratio**: 2:1 (responsive)
- **Interaction Mode**: Index-based (shows all datasets at cursor position)
- **Span Gaps**: Enabled (handles missing data gracefully)
- **Point Styles**: Circles with white borders for clarity

### Color Scheme
- YouTube Views: `#3B82F6` (Blue)
- Fear & Greed: `#F59E0B` (Orange) - changes with value
- BTC Price: `#10B981` (Green)
- RSI: `#A855F7` (Purple, dashed)

### Performance Considerations
- Chart updates only when switching views or changing options
- Efficient data mapping using date-based lookups
- Destroys old chart instance before creating new one
- Filters null values appropriately for gaps

## Future Enhancements
Potential improvements for future versions:
- Export overlay chart as image
- Save favorite view configurations
- Add more technical indicators (MACD, Bollinger Bands)
- Time-shifted correlation analysis
- Correlation coefficient calculations
- Custom color themes
- Multiple RSI overlays for channel comparison

## Troubleshooting

### Chart Not Appearing
- Ensure data is loaded (click "Apply Filters")
- Check browser console for errors
- Verify Chart.js library is loaded

### Axes Overlapping
- This is expected with multiple left axes
- Use normalization to reduce visual clutter
- Or switch back to stacked view for clarity

### Missing Data Points
- Lines will show gaps (spanGaps: true handles this)
- Some metrics may not have data for all dates
- Fear & Greed Index updates daily
- BTC price data available from CoinGecko API
- YouTube views depend on stream activity

## Support
For issues or feature requests, please check the repository documentation or create an issue in the project tracker.
