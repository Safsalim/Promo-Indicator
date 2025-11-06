# VSI (Views Sentiment Indicator) Implementation

## Overview

The VSI (Views Sentiment Indicator) is a sophisticated sentiment analysis tool that transforms raw YouTube livestream view counts into a relative sentiment score on a 0-100 scale. It shows where current viewership ranks relative to all historical data, providing valuable contrarian trading signals.

## How VSI Works

### 1. 7-Day Moving Average (MA7)
- Calculates the average of the last 7 days of peak view counts
- Smooths out daily noise and short-term fluctuations
- Provides a more stable baseline for sentiment analysis

### 2. Percentile Ranking
- For each day, counts how many historical MA7 values are ≤ today's MA7
- Converts to percentile: (count / total_values) × 100
- Results in a 0-100 VSI score

### 3. Sentiment Classification
- **0-10**: Extreme Disinterest (Strong Buy Signal)
- **10-30**: Very Low Interest (Buy Signal)  
- **30-70**: Normal Range (Neutral)
- **70-90**: High Interest (Sell Signal)
- **90-100**: Extreme Hype (Strong Sell Signal)

## Technical Implementation

### Database Schema
```sql
ALTER TABLE live_stream_metrics 
ADD COLUMN views_ma7 REAL DEFAULT NULL,
ADD COLUMN vsi INTEGER DEFAULT NULL,
ADD COLUMN vsi_classification TEXT DEFAULT NULL;
```

### Core Calculation Function
```javascript
function calculateVSI(metricsArray) {
  const ma7Values = metricsArray.map(m => m.views_ma7).filter(v => v !== null);
  
  return metricsArray.map(metric => {
    if (!metric.views_ma7) return null;
    
    // Count how many values are <= current value
    const countLessOrEqual = ma7Values.filter(v => v <= metric.views_ma7).length;
    
    // Calculate percentile (0-100)
    const vsi = (countLessOrEqual / ma7Values.length) * 100;
    
    return {
      ...metric,
      vsi: Math.round(vsi)
    };
  });
}
```

### API Endpoints

#### GET /api/metrics
Enhanced to include VSI data:
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-10",
      "total_live_stream_views": 220,
      "views_ma7": 182.86,
      "vsi": 100,
      "vsi_classification": "Extreme Hype"
    }
  ],
  "vsi": {
    "1": [
      {
        "id": 10,
        "date": "2024-01-10",
        "views_ma7": 182.86,
        "vsi": 100,
        "vsi_classification": "Extreme Hype"
      }
    ]
  }
}
```

#### POST /api/vsi/calculate
Calculate and store VSI for existing data:
```bash
# For all channels
curl -X POST http://localhost:3000/api/vsi/calculate

# For specific channel
curl -X POST http://localhost:3000/api/vsi/calculate \
  -H "Content-Type: application/json" \
  -d '{"channel_id": 1}'
```

### Frontend Integration

#### VSI Chart Component
- **Toggle Control**: Show/hide VSI chart
- **Color Zones**: Visual representation of sentiment ranges
- **Reference Lines**: Key threshold levels at 10, 30, 70, 90
- **Tooltips**: Detailed VSI information with classification

#### Chart Features
- **Responsive Design**: Adapts to different screen sizes
- **Interactive Tooltips**: Hover for detailed information
- **Color Coding**: 
  - Dark Green (0-10): Extreme Disinterest
  - Light Green (10-30): Very Low Interest
  - Gray (30-70): Normal Range
  - Light Red (70-90): High Interest
  - Dark Red (90-100): Extreme Hype

## Usage Instructions

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Run database migration (adds VSI fields)
npm run init-db

# Calculate VSI for existing data
npm run calculate-vsi
```

### 2. Data Collection
```bash
# Collect new livestream metrics
npm run collect-metrics

# Calculate VSI for new data
npm run calculate-vsi
```

### 3. View Dashboard
1. Start server: `npm start`
2. Open dashboard in browser
3. Select channels and date range
4. Enable VSI chart toggle
5. Analyze sentiment signals

## Signal Interpretation

### Buy Signals (Contrarian Opportunities)
- **VSI < 10**: Extreme disinterest - potential market bottom
- **VSI < 30**: Low interest - accumulation opportunity

### Sell Signals (Profit Taking)
- **VSI > 90**: Extreme hype - potential market top
- **VSI > 70**: High interest - consider taking profits

### Neutral Range
- **VSI 30-70**: Normal activity - no clear signal

## Advanced Features

### Signal Generation
The system can generate automated alerts when VSI crosses key thresholds:
- VSI crosses above 90 → "Extreme Hype - Potential Top"
- VSI crosses below 10 → "Extreme Disinterest - Potential Bottom"
- VSI crosses 70 → "High Interest - Consider Taking Profits"
- VSI crosses 30 → "Low Interest - Consider Accumulating"

### Correlation Analysis
- Compare VSI vs Fear & Greed Index
- Identify divergences for trading opportunities
- Track VSI effectiveness in predicting market movements

### AI Pattern Recognition
- Export VSI data for AI analysis
- Upload to ChatGPT/Claude for pattern detection
- Combine with other sentiment indicators

## File Structure

```
src/
├── utils/
│   └── vsi.js                 # VSI calculation functions
├── models/
│   └── LiveStreamMetrics.js     # Updated with VSI methods
├── routes/
│   └── dashboard.js            # Enhanced API endpoints
├── migrations/
│   └── addVSIFields.js        # Database migration script
└── scripts/
    ├── calculateVSI.js          # CLI for VSI calculation
    └── testVSI.js             # VSI calculation tests

frontend/public/
├── index.html                  # Updated with VSI chart section
├── app.js                     # Enhanced with VSI chart logic
└── styles.css                  # Added VSI chart styles
```

## Testing

### Unit Tests
```bash
# Test VSI calculation logic
node src/scripts/testVSI.js
```

### Integration Tests
```bash
# Test API endpoints
npm run test:dashboard

# Test full workflow
npm run test:dashboard-integration
```

## Performance Considerations

### Database Optimization
- VSI calculations use indexed queries
- Batch updates for multiple records
- Efficient percentile ranking algorithm

### Frontend Optimization
- Chart.js for smooth rendering
- Lazy loading of chart data
- Responsive design for mobile devices

## Future Enhancements

### Planned Features
1. **Real-time VSI**: Live updates during data collection
2. **Multi-timeframe VSI**: 14-day, 30-day moving averages
3. **VSI Alerts**: Email/webhook notifications
4. **Backtesting**: Historical VSI signal performance
5. **Machine Learning**: Predictive VSI models

### API Extensions
1. **WebSocket**: Real-time VSI updates
2. **Export Formats**: CSV, JSON, Excel with VSI data
3. **Batch Processing**: Queue-based VSI calculation

## Troubleshooting

### Common Issues

#### VSI Values Not Calculating
- Check if `views_ma7` is populated
- Ensure sufficient historical data (7+ days)
- Verify VSI calculation script ran successfully

#### Chart Not Displaying
- Check browser console for JavaScript errors
- Verify Chart.js and annotation plugin loaded
- Ensure VSI toggle is enabled

#### Performance Issues
- Optimize date range queries
- Use database indexes efficiently
- Consider pagination for large datasets

### Debug Commands
```bash
# Check database schema
sqlite3 database/promo-indicator.db ".schema live_stream_metrics"

# Verify VSI data
sqlite3 database/promo-indicator.db "SELECT date, views_ma7, vsi, vsi_classification FROM live_stream_metrics WHERE vsi IS NOT NULL LIMIT 10"

# Recalculate VSI for specific channel
curl -X POST http://localhost:3000/api/vsi/calculate -H "Content-Type: application/json" -d '{"channel_id": 1}'
```

## Conclusion

The VSI implementation provides a sophisticated sentiment analysis tool that transforms raw viewership data into actionable trading signals. By combining statistical analysis with intuitive visualization, it offers valuable insights for content creators and market analysts alike.

The modular design ensures easy maintenance and future enhancements, while the comprehensive testing framework guarantees reliability and accuracy.