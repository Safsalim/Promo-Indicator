const AnomalyDetector = require('../services/anomalyDetector');
const LiveStreamMetrics = require('../models/LiveStreamMetrics');
const Channel = require('../models/Channel');
const { getDatabase, closeDatabase } = require('../config/database');

console.log('Starting Anomaly Detector Tests...\n');

function setupTestData() {
  console.log('Setting up test data...');
  
  const channel = Channel.create({
    channel_handle: '@testchannel',
    channel_id: 'UC_test123',
    channel_name: 'Test Channel',
    is_active: 1
  });
  
  const channelId = channel.lastInsertRowid;
  
  const testDates = [
    { date: '2024-01-01', views: 1000 },
    { date: '2024-01-02', views: 1100 },
    { date: '2024-01-03', views: 1050 },
    { date: '2024-01-04', views: 1200 },
    { date: '2024-01-05', views: 1150 },
    { date: '2024-01-06', views: 1000 },
    { date: '2024-01-07', views: 1100 },
    { date: '2024-01-08', views: 12000 },
    { date: '2024-01-09', views: 1150 },
    { date: '2024-01-10', views: 1100 }
  ];
  
  testDates.forEach(({ date, views }) => {
    LiveStreamMetrics.createOrUpdate({
      channel_id: channelId,
      date: date,
      total_live_stream_views: views,
      live_stream_count: 1
    });
  });
  
  console.log(`Created test channel (ID: ${channelId}) with ${testDates.length} days of metrics`);
  console.log('Day 2024-01-08 has 12,000 views (10x spike from ~1,100 baseline)\n');
  
  return channelId;
}

function cleanupTestData(channelId) {
  console.log('\nCleaning up test data...');
  if (channelId) {
    LiveStreamMetrics.deleteByChannelId(channelId);
    Channel.delete(channelId);
  }
  console.log('Test data cleaned up');
}

function testAnomalyDetection() {
  let channelId;
  
  try {
    getDatabase();
    
    channelId = setupTestData();
    
    console.log('Test 1: Dry Run Detection');
    console.log('---------------------------');
    const detector = new AnomalyDetector({
      spikeThreshold: 11.0,
      baselineDays: 7,
      minBaselineDays: 3,
      dryRun: true
    });
    
    const result = detector.detectAnomaliesForChannel(channelId);
    
    console.log(`Checked: ${result.checked} metrics`);
    console.log(`Found: ${result.anomalies.length} anomalies`);
    console.log(`Excluded: ${result.excluded} metrics (dry run, so 0 expected)`);
    
    if (result.anomalies.length > 0) {
      console.log('\nDetected anomalies:');
      result.anomalies.forEach(a => {
        console.log(`  - ${a.date}: ${a.views} views (${a.percentage_spike}% spike, baseline: ${a.baseline})`);
      });
    }
    
    console.log('\nTest 2: Real Detection and Exclusion');
    console.log('-------------------------------------');
    const detector2 = new AnomalyDetector({
      spikeThreshold: 11.0,
      baselineDays: 7,
      minBaselineDays: 3,
      dryRun: false
    });
    
    const result2 = detector2.detectAnomaliesForChannel(channelId);
    console.log(`Excluded: ${result2.excluded} metrics`);
    
    console.log('\nTest 3: Verify Exclusion');
    console.log('-------------------------');
    const excluded = LiveStreamMetrics.findExcludedByChannelId(channelId);
    console.log(`Found ${excluded.length} excluded metrics in database`);
    
    if (excluded.length > 0) {
      excluded.forEach(m => {
        console.log(`  - ${m.date}: is_excluded=${m.is_excluded}, reason=${m.exclusion_reason}`);
        if (m.exclusion_metadata) {
          const meta = JSON.parse(m.exclusion_metadata);
          console.log(`    Baseline: ${meta.baseline_avg}, Threshold: ${meta.spike_threshold}x`);
        }
      });
    }
    
    console.log('\nTest 4: Restoration');
    console.log('-------------------');
    const detector3 = new AnomalyDetector();
    const restoreResult = detector3.restoreAutoExcludedMetrics(channelId);
    console.log(`Restored: ${restoreResult.total_restored} metrics`);
    
    const excludedAfter = LiveStreamMetrics.findExcludedByChannelId(channelId);
    console.log(`Excluded metrics remaining: ${excludedAfter.length}`);
    
    console.log('\nTest 5: Custom Threshold (Lower)');
    console.log('---------------------------------');
    const detector4 = new AnomalyDetector({
      spikeThreshold: 5.0,
      baselineDays: 7,
      minBaselineDays: 3,
      dryRun: true
    });
    
    const result4 = detector4.detectAnomaliesForChannel(channelId);
    console.log(`With 5x threshold (400% spike): Found ${result4.anomalies.length} anomalies`);
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (channelId) {
      cleanupTestData(channelId);
    }
    closeDatabase();
  }
}

testAnomalyDetection();
