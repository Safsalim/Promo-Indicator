# Market Data Tables Fix

## Problem
The application was throwing "no such table: fear_greed_index" errors when trying to access market data endpoints because the database tables for BTC price data and Fear & Greed index were never created during database initialization.

## Solution
Updated `/src/config/database.js` to include the creation of the missing tables in the `initializeSchema()` function.

## Changes Made

### Tables Added
1. **btc_price_data** - Stores Bitcoin price data with OHLC (Open, High, Low, Close) values and volume
   - Fields: id, date, open, high, low, close, volume, created_at
   - Unique constraint on date to prevent duplicates

2. **fear_greed_index** - Stores Fear & Greed index values and classifications
   - Fields: id, date, value, classification, created_at
   - Unique constraint on date to prevent duplicates

### Indexes Added
For optimal query performance:
- `idx_btc_price_data_date` - Index on btc_price_data.date
- `idx_fear_greed_index_date` - Index on fear_greed_index.date

## Impact

### Fixed Endpoints
The following API endpoints now work correctly:
- `GET /api/btc-price` - Fetch BTC price data
- `GET /api/fear-greed` - Fetch Fear & Greed index data
- `GET /api/market-summary` - Get combined market data summary
- `POST /api/collect-market-data` - Collect market data for a date range

### Automatic Initialization
- Tables are created automatically on first database connection
- Uses `IF NOT EXISTS` clause, so it's safe for existing databases
- Works for both new installations and existing databases that need migration

## Testing
All endpoints have been tested and confirmed working:
- Tables are created successfully on startup
- Models can read/write data without errors
- API endpoints return proper responses (empty arrays when no data exists)

## Models
The following models now work correctly:
- `src/models/BtcPriceData.js` - Bitcoin price data model
- `src/models/FearGreedIndex.js` - Fear & Greed index model
