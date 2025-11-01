#!/usr/bin/env node
/**
 * Test script to verify verbose logging functionality
 * This will show the search parameters and API behavior
 */

require('dotenv').config();
const { YouTubeApiClient } = require('./src/services/youtubeApiClient');

async function testVerboseSearch() {
  console.log('Testing YouTube API Search with Verbose Logging\n');
  console.log('='.repeat(60));
  
  const client = new YouTubeApiClient();
  client.setVerbose(true);
  
  // Test channel ID for @ciidb
  const channelId = 'UCpSY1H_KhuPJOvS6CJqgiQQ';
  const startDate = '2025-08-01';
  const endDate = '2025-11-01';
  
  console.log('Test Configuration:');
  console.log(`  Channel: @ciidb (${channelId})`);
  console.log(`  Date Range: ${startDate} to ${endDate}`);
  console.log('='.repeat(60));
  
  try {
    console.log('\nStarting search...\n');
    const results = await client.searchLiveStreams(channelId, startDate, endDate);
    
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULTS:');
    console.log(`  Total videos found: ${results.length}`);
    console.log('='.repeat(60));
    
    if (results.length > 0) {
      console.log('\nNow fetching video statistics...\n');
      const videoIds = results.map(r => r.id.videoId);
      const stats = await client.getVideoStatistics(videoIds);
      
      console.log('\n' + '='.repeat(60));
      console.log('STATISTICS SUMMARY:');
      console.log(`  Videos with stats: ${stats.length}`);
      
      let liveStreamCount = 0;
      let regularVideoCount = 0;
      
      stats.forEach(video => {
        if (video.liveStreamingDetails) {
          liveStreamCount++;
        } else if (video.snippet.liveBroadcastContent === 'none') {
          regularVideoCount++;
        }
      });
      
      console.log(`  Live streams (with liveStreamingDetails): ${liveStreamCount}`);
      console.log(`  Regular videos: ${regularVideoCount}`);
      console.log('='.repeat(60));
    }
    
    const quotaUsage = client.getQuotaUsage();
    console.log('\nAPI Quota Usage:');
    console.log(`  Used: ${quotaUsage.used} / ${quotaUsage.limit}`);
    console.log(`  Remaining: ${quotaUsage.remaining}`);
    
  } catch (error) {
    console.error('\n❌ Error during test:');
    console.error(`  Type: ${error.name}`);
    console.error(`  Message: ${error.message}`);
    if (error.type) {
      console.error(`  Error Type: ${error.type}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  testVerboseSearch()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testVerboseSearch };
