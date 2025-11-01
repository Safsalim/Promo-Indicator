/**
 * Dashboard API Test Suite
 * 
 * Tests the dashboard API endpoints without requiring a running server.
 * Uses direct function calls to test business logic and database operations.
 */

const Channel = require('../models/Channel');
const LiveStreamMetrics = require('../models/LiveStreamMetrics');
const { initializeSchema } = require('../models/schema');

// Initialize database schema
console.log('Initializing test database...');
initializeSchema();

console.log('\n=== Dashboard API Tests ===\n');

// Test 1: Channel.findAll() - Initial state
console.log('Test 1: List all channels (should be empty)');
try {
  const channels = Channel.findAll();
  console.log('✓ Channels retrieved:', channels.length);
  console.log('  Data:', JSON.stringify(channels, null, 2));
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 2: Create a channel
console.log('\nTest 2: Create a test channel');
try {
  const result = Channel.create({
    channel_handle: '@testchannel',
    channel_id: 'UCxxxxxxxxxxxxxxxxxx',
    channel_name: 'Test Channel',
    is_active: 1
  });
  console.log('✓ Channel created with ID:', result.lastInsertRowid);
  
  const channel = Channel.findById(result.lastInsertRowid);
  console.log('  Data:', JSON.stringify(channel, null, 2));
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 3: Try to create duplicate channel
console.log('\nTest 3: Try to create duplicate channel (should fail)');
try {
  Channel.create({
    channel_handle: '@testchannel',
    channel_id: 'UCxxxxxxxxxxxxxxxxxx',
    channel_name: 'Test Channel Duplicate',
    is_active: 1
  });
  console.error('✗ Should have thrown an error for duplicate channel');
} catch (error) {
  console.log('✓ Correctly rejected duplicate:', error.message);
}

// Test 4: Create second channel
console.log('\nTest 4: Create second test channel');
try {
  const result = Channel.create({
    channel_handle: '@testchannel2',
    channel_id: 'UCyyyyyyyyyyyyyyyyyy',
    channel_name: 'Test Channel 2',
    is_active: 1
  });
  console.log('✓ Channel created with ID:', result.lastInsertRowid);
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 5: List all channels
console.log('\nTest 5: List all channels');
try {
  const channels = Channel.findAll();
  console.log('✓ Channels retrieved:', channels.length);
  channels.forEach(channel => {
    console.log(`  - ${channel.channel_handle} (${channel.channel_name})`);
  });
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 6: Add metrics for testing
console.log('\nTest 6: Add test metrics data');
try {
  const testDates = [
    '2024-01-15',
    '2024-01-16',
    '2024-01-17',
    '2024-01-18',
    '2024-01-19'
  ];

  testDates.forEach((date, index) => {
    // Metrics for channel 1
    LiveStreamMetrics.create({
      channel_id: 1,
      date: date,
      total_live_stream_views: 5000 + (index * 500),
      live_stream_count: 2 + (index % 3)
    });

    // Metrics for channel 2
    LiveStreamMetrics.create({
      channel_id: 2,
      date: date,
      total_live_stream_views: 3000 + (index * 300),
      live_stream_count: 1 + (index % 2)
    });
  });

  console.log('✓ Test metrics data added for', testDates.length, 'days');
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 7: Query metrics without filters
console.log('\nTest 7: Query all metrics');
try {
  const metrics = LiveStreamMetrics.findAll();
  console.log('✓ Metrics retrieved:', metrics.length);
  console.log('  First record:', JSON.stringify(metrics[0], null, 2));
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 8: Query metrics by channel
console.log('\nTest 8: Query metrics for channel 1');
try {
  const metrics = LiveStreamMetrics.findByChannelId(1);
  console.log('✓ Metrics for channel 1:', metrics.length);
  metrics.forEach(m => {
    console.log(`  - ${m.date}: ${m.total_live_stream_views} views, ${m.live_stream_count} streams`);
  });
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 9: Query metrics by date range
console.log('\nTest 9: Query metrics for date range');
try {
  const metrics = LiveStreamMetrics.findByDateRange('2024-01-16', '2024-01-18');
  console.log('✓ Metrics for date range:', metrics.length);
  metrics.forEach(m => {
    console.log(`  - ${m.channel_name} (${m.date}): ${m.total_live_stream_views} views`);
  });
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 10: Get summary statistics
console.log('\nTest 10: Get summary statistics for channel 1');
try {
  const summary = LiveStreamMetrics.getMetricsSummaryByChannelId(1);
  console.log('✓ Summary statistics:');
  console.log('  Total days:', summary.total_days);
  console.log('  Total views:', summary.total_views);
  console.log('  Average views:', Math.round(summary.avg_views));
  console.log('  Max views:', summary.max_views);
  console.log('  Min views:', summary.min_views);
  console.log('  Total streams:', summary.total_streams);
  console.log('  Average streams:', summary.avg_streams.toFixed(2));
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 11: Test date validation helper
console.log('\nTest 11: Test date validation');
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return false;
  }

  return dateString === date.toISOString().split('T')[0];
}

const testCases = [
  { date: '2024-01-15', expected: true },
  { date: '2024-13-01', expected: false },
  { date: '2024-01-32', expected: false },
  { date: '24-01-15', expected: false },
  { date: '2024/01/15', expected: false },
  { date: 'invalid', expected: false }
];

let passedValidation = 0;
testCases.forEach(testCase => {
  const result = isValidDate(testCase.date);
  if (result === testCase.expected) {
    console.log(`  ✓ "${testCase.date}" -> ${result}`);
    passedValidation++;
  } else {
    console.log(`  ✗ "${testCase.date}" -> ${result} (expected ${testCase.expected})`);
  }
});

console.log(`✓ Date validation: ${passedValidation}/${testCases.length} tests passed`);

// Test 12: Test complex query simulation (what /api/metrics does)
console.log('\nTest 12: Simulate /api/metrics endpoint query');
try {
  const { getDatabase } = require('../config/database');
  const db = getDatabase();

  const channelIds = [1, 2];
  const startDate = '2024-01-16';
  const endDate = '2024-01-18';
  const limit = 10;

  let query = `
    SELECT lsm.*, c.channel_handle, c.channel_name, c.channel_id as youtube_channel_id
    FROM live_stream_metrics lsm
    JOIN channels c ON lsm.channel_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (channelIds && channelIds.length > 0) {
    query += ` AND lsm.channel_id IN (${channelIds.map(() => '?').join(',')})`;
    params.push(...channelIds);
  }

  if (startDate) {
    query += ` AND lsm.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND lsm.date <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY lsm.date ASC, c.channel_name ASC`;

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  const stmt = db.prepare(query);
  const metrics = stmt.all(...params);

  console.log('✓ Query returned', metrics.length, 'records');
  console.log('  Sample:', JSON.stringify(metrics[0], null, 2));
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 13: Test summary statistics query (what /api/metrics/summary does)
console.log('\nTest 13: Simulate /api/metrics/summary endpoint query');
try {
  const { getDatabase } = require('../config/database');
  const db = getDatabase();

  const channelIds = [1, 2];
  const startDate = '2024-01-15';
  const endDate = '2024-01-19';

  let query = `
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT lsm.channel_id) as total_channels,
      COUNT(DISTINCT lsm.date) as total_days,
      SUM(lsm.total_live_stream_views) as total_views,
      AVG(lsm.total_live_stream_views) as avg_views,
      MAX(lsm.total_live_stream_views) as max_views,
      MIN(lsm.total_live_stream_views) as min_views,
      SUM(lsm.live_stream_count) as total_streams,
      AVG(lsm.live_stream_count) as avg_streams
    FROM live_stream_metrics lsm
    WHERE 1=1
  `;
  const params = [];

  if (channelIds && channelIds.length > 0) {
    query += ` AND lsm.channel_id IN (${channelIds.map(() => '?').join(',')})`;
    params.push(...channelIds);
  }

  if (startDate) {
    query += ` AND lsm.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND lsm.date <= ?`;
    params.push(endDate);
  }

  const stmt = db.prepare(query);
  const summary = stmt.get(...params);

  console.log('✓ Summary statistics:');
  console.log('  Total records:', summary.total_records);
  console.log('  Total channels:', summary.total_channels);
  console.log('  Total days:', summary.total_days);
  console.log('  Total views:', summary.total_views);
  console.log('  Average views:', Math.round(summary.avg_views));
  console.log('  Max views:', summary.max_views);
  console.log('  Min views:', summary.min_views);
  console.log('  Total streams:', summary.total_streams);
  console.log('  Average streams:', summary.avg_streams.toFixed(2));
} catch (error) {
  console.error('✗ Error:', error.message);
}

console.log('\n=== All Tests Complete ===\n');
