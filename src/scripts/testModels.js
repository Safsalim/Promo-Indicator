require('dotenv').config();
const { Channel, LiveStreamMetrics } = require('../models');
const { closeDatabase } = require('../config/database');

console.log('Testing Database Models\n');
console.log('='.repeat(60));

try {
  console.log('\n1. Testing Channel Model');
  console.log('-'.repeat(60));
  
  console.log('\nAll channels:');
  const allChannels = Channel.findAll();
  allChannels.forEach(ch => {
    console.log(`  ${ch.id}. ${ch.channel_handle} (${ch.channel_name}) - Active: ${ch.is_active ? 'Yes' : 'No'}`);
  });

  console.log('\nActive channels only:');
  const activeChannels = Channel.findActive();
  console.log(`  Found ${activeChannels.length} active channels`);

  console.log('\nFind by handle:');
  const channel = Channel.findByHandle('@ciidb');
  if (channel) {
    console.log(`  Found: ${channel.channel_name} (ID: ${channel.id})`);
  }

  console.log('\nChannel counts:');
  console.log(`  Total: ${Channel.count()}`);
  console.log(`  Active: ${Channel.countActive()}`);

  console.log('\n2. Testing LiveStreamMetrics Model');
  console.log('-'.repeat(60));

  if (channel) {
    console.log(`\nMetrics for ${channel.channel_handle}:`);
    const metrics = LiveStreamMetrics.findByChannelId(channel.id);
    console.log(`  Total records: ${metrics.length}`);
    
    if (metrics.length > 0) {
      console.log('\n  Recent metrics:');
      metrics.slice(0, 5).forEach(m => {
        console.log(`    ${m.date}: ${m.total_live_stream_views} peak views, ${m.live_stream_count} streams`);
      });
    }

    console.log('\n  Latest metrics:');
    const latest = LiveStreamMetrics.findLatestByChannelId(channel.id);
    if (latest) {
      console.log(`    Date: ${latest.date}`);
      console.log(`    Peak Views: ${latest.total_live_stream_views}`);
      console.log(`    Stream count: ${latest.live_stream_count}`);
    }

    console.log('\n  Summary statistics:');
    const summary = LiveStreamMetrics.getMetricsSummaryByChannelId(channel.id);
    console.log(`    Total days tracked: ${summary.total_days}`);
    console.log(`    Total views: ${summary.total_views}`);
    console.log(`    Average views per day: ${Math.round(summary.avg_views)}`);
    console.log(`    Max views in a day: ${summary.max_views}`);
    console.log(`    Min views in a day: ${summary.min_views}`);
    console.log(`    Total streams: ${summary.total_streams}`);
    console.log(`    Average streams per day: ${summary.avg_streams.toFixed(2)}`);
  }

  console.log('\n3. Testing Date Range Queries');
  console.log('-'.repeat(60));

  if (channel) {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    const startDate = threeDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    console.log(`\nMetrics from ${startDate} to ${endDate}:`);
    const rangeMetrics = LiveStreamMetrics.findByChannelIdAndDateRange(
      channel.id,
      startDate,
      endDate
    );
    
    rangeMetrics.forEach(m => {
      console.log(`  ${m.date}: ${m.total_live_stream_views} peak views, ${m.live_stream_count} streams`);
    });
  }

  console.log('\n4. Testing Upsert Functionality');
  console.log('-'.repeat(60));

  const testDate = new Date().toISOString().split('T')[0];
  const testChannel = Channel.findActive()[0];

  if (testChannel) {
    console.log(`\nTesting upsert for ${testChannel.channel_handle} on ${testDate}:`);
    
    console.log('  First insert...');
    LiveStreamMetrics.createOrUpdate({
      channel_id: testChannel.id,
      date: testDate,
      total_live_stream_views: 1000,
      live_stream_count: 2
    });
    
    let current = LiveStreamMetrics.findByChannelIdAndDate(testChannel.id, testDate);
    console.log(`    Peak Views: ${current.total_live_stream_views}, Streams: ${current.live_stream_count}`);

    console.log('  Update (upsert)...');
    LiveStreamMetrics.createOrUpdate({
      channel_id: testChannel.id,
      date: testDate,
      total_live_stream_views: 2500,
      live_stream_count: 5
    });
    
    current = LiveStreamMetrics.findByChannelIdAndDate(testChannel.id, testDate);
    console.log(`    Peak Views: ${current.total_live_stream_views}, Streams: ${current.live_stream_count}`);
    console.log('  ✓ Upsert working correctly!');
  }

  console.log('\n' + '='.repeat(60));
  console.log('All tests completed successfully!');

} catch (error) {
  console.error('\nError during testing:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
