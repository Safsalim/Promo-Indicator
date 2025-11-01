# Market Data Integration Features

## Overview

This feature adds Bitcoin (BTC) price data and Crypto Fear & Greed Index data collection and visualization to the sentiment dashboard. This allows users to correlate YouTube live stream sentiment indicators with established market metrics.

## Features

### 1. BTC Price Data Collection
- **Source**: CoinGecko API (free tier)
- **Endpoint**: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range`
- **Data Collected**: Daily OHLC (Open, High, Low, Close) and Volume
- **Storage**: SQLite database (`btc_price_data` table)

### 2. Fear & Greed Index Data Collection
- **Source**: Alternative.me Crypto Fear & Greed Index API
- **Endpoint**: `https://api.alternative.me/fng/`
- **Data Collected**: Daily sentiment value (0-100) with classification
- **Classifications**:
  - 0-24: Extreme Fear (Red)
  - 25-49: Fear (Orange)
  - 50-74: Greed (Yellow)
  - 75-100: Extreme Greed (Green)
- **Storage**: SQLite database (`fear_greed_index` table)

## Database Schema

### btc_price_data Table
```sql
CREATE TABLE btc_price_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### fear_greed_index Table
```sql
CREATE TABLE fear_greed_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  value INTEGER,
  classification TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### GET /api/btc-price
Retrieve BTC price data for a date range.

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2025-01-20",
      "open": 101275.34,
      "high": 108228.27,
      "low": 99717.61,
      "close": 103446.74,
      "volume": 114169227614.81,
      "created_at": "2025-11-01 18:42:40"
    }
  ],
  "count": 1
}
```

### GET /api/fear-greed
Retrieve Fear & Greed index data for a date range.

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2025-01-20",
      "value": 45,
      "classification": "Fear",
      "created_at": "2025-11-01 18:44:05"
    }
  ],
  "count": 1
}
```

### POST /api/collect-market-data
Trigger manual collection of market data for a date range.

**Request Body:**
```json
{
  "start_date": "2025-01-01",
  "end_date": "2025-01-31"
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Market data collection completed",
  "results": {
    "btc": {
      "insertedCount": 20,
      "updatedCount": 5,
      "totalCount": 25
    },
    "fearGreed": {
      "insertedCount": 18,
      "updatedCount": 3,
      "totalCount": 21
    }
  }
}
```

### GET /api/market-summary
Get summary statistics for market data.

**Query Parameters:**
- `start_date` (optional): Start date in YYYY-MM-DD format
- `end_date` (optional): End date in YYYY-MM-DD format

**Example Response:**
```json
{
  "success": true,
  "data": {
    "btc": {
      "count": 31,
      "firstDate": "2024-12-01",
      "lastDate": "2024-12-31",
      "firstPrice": 97755.08,
      "lastPrice": 93302.24,
      "highestPrice": 108228.27,
      "lowestPrice": 91816.86,
      "avgPrice": 96543.21,
      "avgVolume": 78234567890.12,
      "priceChange": -4452.84,
      "priceChangePercent": -4.55
    },
    "fearGreed": {
      "count": 12,
      "firstDate": "2024-12-01",
      "lastDate": "2025-01-25",
      "firstValue": 78,
      "lastValue": 38,
      "avgValue": 60.5,
      "minValue": 38,
      "maxValue": 82,
      "classifications": {
        "Extreme Greed": 1,
        "Greed": 8,
        "Fear": 3
      }
    }
  }
}
```

## CLI Usage

### Collect Market Data
```bash
# Collect last 90 days (default)
npm run collect-market-data

# Collect specific date range
npm run collect-market-data -- --start-date 2025-01-01 --end-date 2025-01-31

# Show help
npm run collect-market-data -- --help
```

### Script Options
- `-s, --start-date DATE`: Start date (YYYY-MM-DD, default: 90 days ago)
- `-e, --end-date DATE`: End date (YYYY-MM-DD, default: yesterday)
- `-h, --help`: Show help message

## Dashboard Visualization

The dashboard now includes three synchronized charts:

### 1. Live Stream Views Chart (Existing)
- Shows YouTube live stream peak view counts over time
- Displays RSI (Relative Strength Index) indicator

### 2. BTC Price Chart (New)
- Line chart showing daily Bitcoin closing prices
- Tooltip displays Open, High, Low, Close values
- Orange color (#f7931a - Bitcoin brand color)
- Synchronized with other charts

### 3. Fear & Greed Index Chart (New)
- Line chart with color-coded sentiment zones
- Dynamic point colors based on classification:
  - Red: Extreme Fear (0-24)
  - Orange: Fear (25-49)
  - Yellow: Greed (50-74)
  - Green: Extreme Greed (75-100)
- Reference lines at 25, 50, and 75
- Synchronized with other charts

### Chart Synchronization
- All charts share the same date range
- Hover tooltips show data for all charts at that date
- Zoom and pan operations apply to all charts
- Visual correlation between sentiment indicators

## Use Cases

### Correlation Analysis
Compare YouTube sentiment with market indicators to:
- Identify if high view counts coincide with market tops (euphoria)
- Check if low engagement correlates with market bottoms (fear)
- Validate sentiment indicators against established metrics

### Sentiment Divergence
Spot divergences between:
- YouTube RSI vs Fear & Greed Index
- View count trends vs BTC price movements
- Social sentiment vs market sentiment

### Market Timing
Use combined indicators to:
- Identify potential reversal points
- Confirm trend strength
- Time entry/exit points based on multi-source sentiment

## Data Collection Best Practices

1. **Initial Setup**: Collect 90 days of historical data:
   ```bash
   npm run collect-market-data -- -s 2024-08-01 -e 2024-11-01
   ```

2. **Regular Updates**: Schedule daily collection via cron:
   ```bash
   # Add to crontab (runs at 1 AM daily)
   0 1 * * * cd /path/to/project && npm run collect-market-data >> /path/to/logs/market-data.log 2>&1
   ```

3. **API Limitations**:
   - CoinGecko free tier: Limited historical data range (recent months work best)
   - Fear & Greed API: Free, no authentication required
   - Rate limits: Both APIs are generally permissive for reasonable usage

## Technical Implementation

### Models
- `BtcPriceData.js`: Database model for Bitcoin price data
- `FearGreedIndex.js`: Database model for Fear & Greed index

### Services
- `marketDataService.js`: Handles API requests and data aggregation
  - `fetchBtcPriceData()`: Fetches and aggregates BTC price to daily candles
  - `fetchFearGreedIndex()`: Fetches Fear & Greed historical data
  - `collectAllMarketData()`: Collects both data sources

### Routes
- `marketData.js`: Express routes for market data endpoints

### Frontend
- Chart rendering using Chart.js
- Color-coded visualization for sentiment zones
- Responsive design matching existing dashboard style

## Troubleshooting

### CoinGecko 401 Unauthorized Error
- **Cause**: Free tier API has limited historical data access
- **Solution**: Use recent date ranges (last 3-6 months typically work)
- **Alternative**: Consider CoinGecko Pro API for extended historical data

### Fear & Greed Data Not Collecting
- **Cause**: API may return future dates or have limited historical coverage
- **Solution**: Adjust date range or manually verify API response
- **Check**: `curl "https://api.alternative.me/fng/?limit=5"`

### Charts Not Displaying
- **Check**: Browser console for JavaScript errors
- **Verify**: Data exists in database (query tables directly)
- **Confirm**: API endpoints return data (test with curl)

## Future Enhancements

Potential improvements for correlation analysis:

1. **Correlation Coefficients**: Calculate and display correlation values between:
   - YouTube views vs BTC price
   - YouTube RSI vs Fear & Greed Index
   - Lead/lag analysis

2. **Overlay Charts**: Option to overlay multiple metrics on single chart with dual Y-axes

3. **Additional Metrics**:
   - Trading volume
   - Social media mentions
   - On-chain metrics

4. **Export Features**: Download correlation data as CSV for external analysis

5. **Alerts**: Notification system for divergence patterns or correlation thresholds

## Credits

- **BTC Price Data**: [CoinGecko API](https://www.coingecko.com/en/api)
- **Fear & Greed Index**: [Alternative.me](https://alternative.me/crypto/fear-and-greed-index/)
- **Visualization**: [Chart.js](https://www.chartjs.org/)
