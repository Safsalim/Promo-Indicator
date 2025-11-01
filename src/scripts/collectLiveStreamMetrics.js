#!/usr/bin/env node

require('dotenv').config();
const liveStreamCollector = require('../services/liveStreamCollector');
const { closeDatabase } = require('../config/database');

function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    startDate: null,
    endDate: null,
    channelIds: [],
    dryRun: false,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      
      case '-s':
      case '--start-date':
        options.startDate = args[++i];
        break;
      
      case '-e':
      case '--end-date':
        options.endDate = args[++i];
        break;
      
      case '-c':
      case '--channels':
        const channelList = args[++i];
        options.channelIds = channelList.split(',').map(id => parseInt(id.trim()));
        break;
      
      case '-d':
      case '--dry-run':
        options.dryRun = true;
        break;
      
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      
      default:
        console.error(`Unknown option: ${arg}`);
        options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Live Stream Metrics Collection Tool

Usage: node collectLiveStreamMetrics.js [options]

Options:
  -h, --help              Show this help message
  -s, --start-date DATE   Start date (YYYY-MM-DD, default: yesterday)
  -e, --end-date DATE     End date (YYYY-MM-DD, default: same as start date)
  -c, --channels IDS      Comma-separated channel IDs to process (default: all active)
  -d, --dry-run           Run without saving data (preview mode)
  -v, --verbose           Enable verbose logging with detailed video information

Examples:
  # Collect metrics for yesterday (default)
  node collectLiveStreamMetrics.js

  # Collect metrics for specific date
  node collectLiveStreamMetrics.js --start-date 2024-01-15

  # Collect metrics for date range
  node collectLiveStreamMetrics.js --start-date 2024-01-01 --end-date 2024-01-31

  # Collect for specific channels only
  node collectLiveStreamMetrics.js --channels 1,2,3

  # Dry run to preview without saving
  node collectLiveStreamMetrics.js --dry-run

  # Verbose mode for debugging
  node collectLiveStreamMetrics.js --start-date 2024-08-28 --end-date 2024-08-28 --verbose

  # Combine options
  node collectLiveStreamMetrics.js -s 2024-01-01 -e 2024-01-07 -c 1,2 -d -v
`);
}

function validateDate(dateString) {
  if (!dateString) return true;
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

async function main() {
  try {
    const options = parseArguments();

    if (options.help) {
      printHelp();
      process.exit(0);
    }

    if (options.startDate && !validateDate(options.startDate)) {
      console.error('Error: Invalid start date format. Use YYYY-MM-DD');
      process.exit(1);
    }

    if (options.endDate && !validateDate(options.endDate)) {
      console.error('Error: Invalid end date format. Use YYYY-MM-DD');
      process.exit(1);
    }

    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      const end = new Date(options.endDate);
      if (start > end) {
        console.error('Error: Start date must be before or equal to end date');
        process.exit(1);
      }
    }

    const collectionOptions = {
      startDate: options.startDate,
      endDate: options.endDate,
      channelIds: options.channelIds.length > 0 ? options.channelIds : null,
      dryRun: options.dryRun,
      verbose: options.verbose
    };

    const results = await liveStreamCollector.collectMetrics(collectionOptions);

    if (results.failed > 0) {
      console.log('\nFailed channels:');
      results.details
        .filter(d => !d.success)
        .forEach(d => {
          console.log(`  - ${d.channelHandle || d.channelId}: ${d.message}`);
        });
    }

    closeDatabase();
    
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    console.error(error.stack);
    closeDatabase();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArguments, validateDate };
