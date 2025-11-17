#!/usr/bin/env node

require('dotenv').config();
const { YouTubeApiClient } = require('../services/youtubeApiClient');
const GoogleSheetsClient = require('../config/googleSheets');

const CIIDB_HANDLE = '@ciidb';
const START_DATE = '2024-11-09';
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/18MJllYCK717LannQHktc1oz3EJy2aCSNbgh5LEShzQU/edit?gid=857080924#gid=857080924';

async function fetchCiidbLivestreamsToSheet() {
  console.log('🚀 Starting @ciidb Livestream Data Collection\n');

  const youtubeClient = new YouTubeApiClient();
  const sheetsClient = new GoogleSheetsClient();

  try {
    console.log(`📺 Resolving channel: ${CIIDB_HANDLE}`);
    const { channelId, channelTitle } = await youtubeClient.resolveChannelHandle(CIIDB_HANDLE);
    console.log(`✅ Found channel: ${channelTitle} (${channelId})\n`);

    const endDate = new Date().toISOString().split('T')[0];
    console.log(`📅 Fetching livestreams from ${START_DATE} to ${endDate}`);
    
    const videos = await youtubeClient.searchLiveStreams(
      channelId,
      START_DATE,
      endDate,
      { maxResults: 50 }
    );
    
    console.log(`🔍 Found ${videos.length} videos in the date range\n`);

    if (videos.length === 0) {
      console.log('⚠️  No videos found in the specified date range');
      return;
    }

    const videoIds = videos.map(v => v.id.videoId);
    console.log(`📊 Fetching detailed statistics for ${videoIds.length} videos...`);
    
    const statistics = await youtubeClient.getVideoStatistics(videoIds);
    
    const livestreams = [];
    let filteredCount = 0;

    console.log('\n🎯 Filtering for actual livestreams:\n');
    
    for (const video of statistics) {
      const isLivestream = 
        video.snippet.liveBroadcastContent === 'none' && 
        video.liveStreamingDetails &&
        video.liveStreamingDetails.actualStartTime;
      
      const isPublic = video.status?.privacyStatus === 'public';
      
      if (isLivestream && isPublic) {
        const publishedDate = video.snippet.publishedAt.split('T')[0];
        const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
        const viewCount = parseInt(video.statistics.viewCount || 0);
        
        livestreams.push({
          date: publishedDate,
          url: videoUrl,
          views: viewCount,
          title: video.snippet.title,
          videoId: video.id
        });
        
        console.log(`  ✓ ${publishedDate} | ${viewCount.toLocaleString()} views | ${video.snippet.title}`);
      } else {
        filteredCount++;
        console.log(`  ✗ Skipped: ${video.snippet.title} (${video.snippet.liveBroadcastContent}, ${video.status?.privacyStatus})`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Total videos found: ${videos.length}`);
    console.log(`   Actual livestreams: ${livestreams.length}`);
    console.log(`   Filtered out: ${filteredCount}\n`);

    if (livestreams.length === 0) {
      console.log('⚠️  No valid livestreams found to export');
      return;
    }

    livestreams.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`📝 Preparing Google Sheet data...`);
    const spreadsheetId = sheetsClient.extractSpreadsheetId(SHEET_URL);
    console.log(`   Spreadsheet ID: ${spreadsheetId}`);

    const headers = ['Livestream Date', 'Video URL', 'Views Count'];
    const rows = livestreams.map(ls => [ls.date, ls.url, ls.views]);
    const allData = [headers, ...rows];

    console.log(`\n🔄 Checking for existing data...`);
    let existingData = [];
    try {
      existingData = await sheetsClient.getSheetData(spreadsheetId, 'A1:C1000');
      console.log(`   Found ${existingData.length} existing rows`);
    } catch (error) {
      console.log(`   No existing data or sheet is empty`);
    }

    const existingUrls = new Set(
      existingData.slice(1).map(row => row[1]).filter(Boolean)
    );

    const newLivestreams = livestreams.filter(ls => !existingUrls.has(ls.url));
    
    console.log(`\n📊 Data Analysis:`);
    console.log(`   Existing entries: ${existingData.length > 0 ? existingData.length - 1 : 0}`);
    console.log(`   New entries to add: ${newLivestreams.length}`);
    console.log(`   Duplicates skipped: ${livestreams.length - newLivestreams.length}`);

    if (existingData.length === 0) {
      console.log(`\n✍️  Writing fresh data to Google Sheet...`);
      await sheetsClient.updateSheet(spreadsheetId, 'A1', allData);
      console.log(`✅ Successfully wrote ${livestreams.length} livestreams to the sheet`);
    } else if (newLivestreams.length > 0) {
      const hasHeaders = existingData[0] && 
                        existingData[0][0] === 'Livestream Date' && 
                        existingData[0][1] === 'Video URL';
      
      if (!hasHeaders) {
        console.log(`\n✍️  Adding headers and all data...`);
        await sheetsClient.updateSheet(spreadsheetId, 'A1', allData);
        console.log(`✅ Successfully wrote headers and ${livestreams.length} livestreams`);
      } else {
        console.log(`\n✍️  Appending ${newLivestreams.length} new livestreams...`);
        const newRows = newLivestreams.map(ls => [ls.date, ls.url, ls.views]);
        await sheetsClient.appendSheet(spreadsheetId, 'A:C', newRows);
        console.log(`✅ Successfully appended ${newLivestreams.length} new livestreams`);
      }
    } else {
      console.log(`\n✅ No new data to add - sheet is already up to date`);
    }

    console.log(`\n🎉 Task completed successfully!`);
    console.log(`   View the sheet at: ${SHEET_URL}\n`);

    console.log('📋 Quota Usage:');
    const quotaInfo = youtubeClient.getQuotaUsage();
    console.log(`   Used: ${quotaInfo.used} / ${quotaInfo.limit} (${quotaInfo.percentage}%)`);
    console.log(`   Remaining: ${quotaInfo.remaining}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack && process.env.DEBUG) {
      console.error('\nStack Trace:', error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  fetchCiidbLivestreamsToSheet();
}

module.exports = fetchCiidbLivestreamsToSheet;
