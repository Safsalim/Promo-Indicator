const AnomalyDetector = require('../services/anomalyDetector');
const Channel = require('../models/Channel');
const { getDatabase } = require('../config/database');

function printHelp() {
  console.log(`
Anomaly Detection Script

Usage:
  node src/scripts/detectAnomalies.js [options]

Options:
  --channel <handle>        Run detection for a specific channel handle
  --channel-id <id>         Run detection for a specific channel ID
  --start-date <YYYY-MM-DD> Start date for detection range (optional)
  --end-date <YYYY-MM-DD>   End date for detection range (optional)
  --threshold <number>      Spike threshold multiplier (default: 10.0 for 1000% increase or 10x)
  --lookback-days <number>  Days to look back for previous day (default: 7)
  --dry-run                 Show what would be excluded without actually excluding
  --restore                 Restore auto-excluded anomalies instead of detecting new ones
  --list-excluded           List all auto-excluded metrics
  --help                    Show this help message

Examples:
  # Detect anomalies for all channels with default 1000% threshold
  node src/scripts/detectAnomalies.js

  # Dry run to see what would be excluded
  node src/scripts/detectAnomalies.js --dry-run

  # Detect with custom 500% threshold (6x multiplier)
  node src/scripts/detectAnomalies.js --threshold 6

  # Detect for specific channel
  node src/scripts/detectAnomalies.js --channel @channelhandle

  # Detect for date range
  node src/scripts/detectAnomalies.js --start-date 2024-01-01 --end-date 2024-12-31

  # List all auto-excluded metrics
  node src/scripts/detectAnomalies.js --list-excluded

  # Restore all auto-excluded metrics
  node src/scripts/detectAnomalies.js --restore

  # Restore for specific channel and date range
  node src/scripts/detectAnomalies.js --restore --channel @channelhandle --start-date 2024-01-01
  `);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    channelHandle: null,
    channelId: null,
    startDate: null,
    endDate: null,
    threshold: 10.0,
    lookbackDays: 7,
    dryRun: false,
    restore: false,
    listExcluded: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--channel':
        options.channelHandle = args[++i];
        break;
      case '--channel-id':
        options.channelId = parseInt(args[++i]);
        break;
      case '--start-date':
        options.startDate = args[++i];
        break;
      case '--end-date':
        options.endDate = args[++i];
        break;
      case '--threshold':
        options.threshold = parseFloat(args[++i]);
        break;
      case '--lookback-days':
        options.lookbackDays = parseInt(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--restore':
        options.restore = true;
        break;
      case '--list-excluded':
        options.listExcluded = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        options.help = true;
    }
  }

  return options;
}

function listExcludedMetrics() {
  const detector = new AnomalyDetector();
  const excluded = detector.getAutoExcludedMetrics();

  if (excluded.length === 0) {
    console.log('No auto-excluded metrics found.');
    return;
  }

  console.log(`\nFound ${excluded.length} auto-excluded metrics:\n`);
  
  console.log('ID'.padEnd(6) + 'Channel'.padEnd(25) + 'Date'.padEnd(15) + 'Views'.padEnd(12) + 'Excluded At');
  console.log('-'.repeat(80));

  excluded.forEach(metric => {
    const id = metric.id.toString().padEnd(6);
    const channel = (metric.channel_handle || metric.channel_name || 'Unknown').padEnd(25);
    const date = metric.date.padEnd(15);
    const views = metric.total_live_stream_views.toString().padEnd(12);
    const excludedAt = new Date(metric.excluded_at).toISOString().split('T')[0];
    
    console.log(`${id}${channel}${date}${views}${excludedAt}`);
    
    if (metric.exclusion_metadata) {
      try {
        const metadata = JSON.parse(metric.exclusion_metadata);
        if (metadata.previous_day && metadata.previous_views) {
          console.log(`      Previous: ${metadata.previous_views} views on ${metadata.previous_day}, Threshold: ${metadata.spike_threshold}x`);
        }
      } catch (e) {
      }
    }
  });

  console.log('');
}

function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  try {
    getDatabase();

    if (options.listExcluded) {
      listExcludedMetrics();
      process.exit(0);
    }

    const detector = new AnomalyDetector({
      spikeThreshold: options.threshold,
      lookbackDays: options.lookbackDays,
      dryRun: options.dryRun
    });

    if (options.restore) {
      console.log('Restoring auto-excluded metrics...\n');
      
      let channelId = options.channelId;
      if (options.channelHandle && !channelId) {
        const channel = Channel.findByHandle(options.channelHandle);
        if (!channel) {
          console.error(`Channel not found: ${options.channelHandle}`);
          process.exit(1);
        }
        channelId = channel.id;
      }

      const result = detector.restoreAutoExcludedMetrics(
        channelId,
        options.startDate,
        options.endDate
      );

      console.log(`\nRestored ${result.total_restored} metrics`);
    } else {
      if (options.dryRun) {
        console.log('DRY RUN MODE - No changes will be made\n');
      }

      let result;
      if (options.channelHandle || options.channelId) {
        let channelId = options.channelId;
        
        if (options.channelHandle && !channelId) {
          const channel = Channel.findByHandle(options.channelHandle);
          if (!channel) {
            console.error(`Channel not found: ${options.channelHandle}`);
            process.exit(1);
          }
          channelId = channel.id;
        }

        result = detector.detectAnomaliesForChannel(
          channelId,
          options.startDate,
          options.endDate
        );

        if (result.anomalies.length > 0) {
          console.log(`\nAnomalies found for ${result.channel.channel_handle}:\n`);
          result.anomalies.forEach(anomaly => {
            console.log(`  ${anomaly.date}: ${anomaly.views} views (${anomaly.percentage_increase}% increase from ${anomaly.previous_views} on ${anomaly.previous_day}, ratio: ${anomaly.ratio}x)`);
          });
        } else {
          console.log(`\nNo anomalies found for ${result.channel.channel_handle}`);
        }
      } else {
        result = detector.detectAnomaliesForAllChannels(
          options.startDate,
          options.endDate
        );

        if (result.total_anomalies > 0) {
          console.log('\nSummary by channel:');
          result.channels.forEach(channelResult => {
            if (channelResult.anomalies.length > 0) {
              console.log(`\n${channelResult.channel.channel_handle}:`);
              channelResult.anomalies.forEach(anomaly => {
                console.log(`  ${anomaly.date}: ${anomaly.views} views (${anomaly.percentage_increase}% increase from ${anomaly.previous_views} on ${anomaly.previous_day}, ratio: ${anomaly.ratio}x)`);
              });
            }
          });
        }
      }

      console.log('\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, parseArgs };
