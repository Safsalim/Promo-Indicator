require('dotenv').config();
const { YouTubeApiClient, YouTubeApiError } = require('../services/youtubeApiClient');

async function exampleUsage() {
  const client = new YouTubeApiClient();

  console.log('='.repeat(70));
  console.log('YouTube API Client - Example Usage');
  console.log('='.repeat(70));
  console.log();

  try {
    console.log('1. Resolving channel handle to channel ID');
    console.log('-'.repeat(70));
    const channelHandle = '@ciidb';
    console.log(`Looking up channel: ${channelHandle}`);
    
    const { channelId, channelTitle } = await client.resolveChannelHandle(channelHandle);
    console.log(`✓ Channel ID: ${channelId}`);
    console.log(`✓ Channel Name: ${channelTitle}`);
    console.log();

    console.log('2. Fetching live stream view counts for a specific date');
    console.log('-'.repeat(70));
    const date = '2024-01-15';
    console.log(`Fetching live streams for date: ${date}`);
    
    const viewCounts = await client.getLiveStreamViewCounts(channelId, date);
    console.log(`✓ Total Views: ${viewCounts.totalViews.toLocaleString()}`);
    console.log(`✓ Stream Count: ${viewCounts.streamCount}`);
    
    if (viewCounts.streams.length > 0) {
      console.log('\nStreams found:');
      viewCounts.streams.forEach((stream, index) => {
        console.log(`  ${index + 1}. ${stream.title}`);
        console.log(`     Views: ${stream.viewCount.toLocaleString()}`);
        console.log(`     Published: ${stream.publishedAt}`);
      });
    }
    console.log();

    console.log('3. Aggregating live stream views over a date range');
    console.log('-'.repeat(70));
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';
    console.log(`Fetching live streams from ${startDate} to ${endDate}`);
    
    const aggregateViews = await client.getLiveStreamAggregateViews(channelId, startDate, endDate);
    
    const dates = Object.keys(aggregateViews).sort();
    console.log(`✓ Found data for ${dates.length} date(s)`);
    
    if (dates.length > 0) {
      console.log('\nAggregate by date:');
      let totalViews = 0;
      let totalStreams = 0;
      
      dates.forEach(date => {
        const data = aggregateViews[date];
        totalViews += data.totalViews;
        totalStreams += data.streamCount;
        console.log(`  ${date}: ${data.streamCount} stream(s), ${data.totalViews.toLocaleString()} views`);
      });
      
      console.log('\nSummary:');
      console.log(`  Total Views: ${totalViews.toLocaleString()}`);
      console.log(`  Total Streams: ${totalStreams}`);
      console.log(`  Average Views per Stream: ${Math.round(totalViews / totalStreams).toLocaleString()}`);
    }
    console.log();

    console.log('4. Checking API quota usage');
    console.log('-'.repeat(70));
    const quotaUsage = client.getQuotaUsage();
    console.log(`✓ Quota Used: ${quotaUsage.used} / ${quotaUsage.limit} (${quotaUsage.percentage}%)`);
    console.log(`✓ Quota Remaining: ${quotaUsage.remaining}`);
    console.log();

    console.log('='.repeat(70));
    console.log('Example completed successfully!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('ERROR OCCURRED');
    console.error('='.repeat(70));
    
    if (error instanceof YouTubeApiError) {
      console.error(`Error Type: ${error.type}`);
      console.error(`Message: ${error.message}`);
      
      switch (error.type) {
        case 'AUTH_ERROR':
          console.error('\nTroubleshooting:');
          console.error('- Check that YOUTUBE_API_KEY is set in your .env file');
          console.error('- Verify the API key is valid in Google Cloud Console');
          console.error('- Ensure YouTube Data API v3 is enabled for your project');
          break;
        
        case 'QUOTA_EXCEEDED':
          console.error('\nTroubleshooting:');
          console.error('- You have exceeded your daily API quota');
          console.error('- Wait for quota reset (daily at midnight Pacific Time)');
          console.error('- Request a quota increase in Google Cloud Console');
          break;
        
        case 'NOT_FOUND':
          console.error('\nTroubleshooting:');
          console.error('- Check that the channel handle is correct');
          console.error('- Verify the channel exists on YouTube');
          break;
        
        case 'NETWORK_ERROR':
          console.error('\nTroubleshooting:');
          console.error('- Check your internet connection');
          console.error('- Verify YouTube API is accessible');
          console.error('- Try again later if YouTube API is experiencing issues');
          break;
        
        default:
          console.error('\nTroubleshooting:');
          console.error('- Check the error message above for details');
          console.error('- Review your API configuration');
      }
    } else {
      console.error(`Message: ${error.message}`);
      console.error('Stack trace:', error.stack);
    }
    
    console.error('='.repeat(70));
    process.exit(1);
  }
}

async function demonstrateErrorHandling() {
  console.log('\n' + '='.repeat(70));
  console.log('Error Handling Demonstration');
  console.log('='.repeat(70));
  console.log();

  const client = new YouTubeApiClient();

  console.log('Testing invalid channel handle...');
  try {
    await client.resolveChannelHandle('@this_channel_definitely_does_not_exist_12345');
    console.log('No error occurred (unexpected)');
  } catch (error) {
    if (error instanceof YouTubeApiError) {
      console.log(`✓ Caught expected error: ${error.type} - ${error.message}`);
    } else {
      console.log(`✗ Unexpected error type: ${error.message}`);
    }
  }
  
  console.log();
  console.log('='.repeat(70));
}

if (require.main === module) {
  (async () => {
    await exampleUsage();
    await demonstrateErrorHandling();
  })();
}

module.exports = { exampleUsage, demonstrateErrorHandling };
