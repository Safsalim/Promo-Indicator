#!/usr/bin/env node

require('dotenv').config();
const { initializeSchema } = require('../models/schema');
const MarketDataService = require('../services/marketDataService');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    startDate: null,
    endDate: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-s' || arg === '--start-date') {
      options.startDate = args[++i];
    } else if (arg === '-e' || arg === '--end-date') {
      options.endDate = args[++i];
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Market Data Collection Tool
============================

Collects Bitcoin price data and Fear & Greed index for the specified date range.

Usage:
  npm run collect-market-data -- [options]

Options:
  -s, --start-date DATE   Start date (YYYY-MM-DD, default: 90 days ago)
  -e, --end-date DATE     End date (YYYY-MM-DD, default: yesterday)
  -h, --help              Show this help message

Examples:
  # Collect last 30 days
  npm run collect-market-data -- --start-date 2025-01-01 --end-date 2025-01-31

  # Collect last 90 days (using default dates)
  npm run collect-market-data

  # Collect historical data (back to 2013)
   npm run collect-market-data -- -s 2013-04-28 -e 2024-11-01

  # Collect specific date range
  npm run collect-market-data -- -s 2024-08-01 -e 2024-11-01

Notes:
   - BTC price data is fetched from CoinGecko API (free, no API key required)
   - CoinGecko API supports historical data from 2013-04-28 onwards
   - Fear & Greed index is fetched from Alternative.me API (free, limited to ~3000 days)
   - Data is stored in the local SQLite database
   - Existing data for the same dates will be updated
  `);
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function validateDate(dateStr) {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  initializeSchema();

  const startDate = options.startDate || getDefaultStartDate();
  const endDate = options.endDate || getDefaultEndDate();

  if (!validateDate(startDate)) {
    console.error(`Error: Invalid start date: ${startDate}`);
    console.error('Date must be in YYYY-MM-DD format');
    process.exit(1);
  }

  if (!validateDate(endDate)) {
    console.error(`Error: Invalid end date: ${endDate}`);
    console.error('Date must be in YYYY-MM-DD format');
    process.exit(1);
  }

  if (startDate > endDate) {
    console.error('Error: Start date must be before or equal to end date');
    process.exit(1);
  }

  try {
    await MarketDataService.collectAllMarketData(startDate, endDate);
    
    console.log('\n✅ Market data collection completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Market data collection failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
