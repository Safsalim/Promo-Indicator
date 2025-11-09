require('dotenv').config();
const Channel = require('../models/Channel');
const LiveStreamMetrics = require('../models/LiveStreamMetrics');

function seedTestData() {
  try {
    console.log('🌱 Seeding test data for VSI report...\n');

    const existingChannels = Channel.findAll();
    let channelId;

    if (existingChannels.length === 0) {
      console.log('📝 Creating test channel...');
      const result = Channel.create({
        channel_handle: '@TestChannel',
        channel_id: 'UCtest123',
        channel_name: 'Test Channel',
        is_active: 1
      });
      channelId = result.lastInsertRowid;
      console.log(`✅ Created test channel with ID: ${channelId}`);
    } else {
      channelId = existingChannels[0].id;
      console.log(`✅ Using existing channel: ${existingChannels[0].channel_name} (ID: ${channelId})`);
    }

    console.log('\n📊 Creating 35 days of test metrics...');
    
    const today = new Date();
    const baseViews = 10000;

    for (let i = 35; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const variation = Math.sin(i / 5) * 3000 + Math.random() * 2000;
      const views = Math.floor(baseViews + variation);
      const streamCount = Math.floor(Math.random() * 3) + 1;

      const existing = LiveStreamMetrics.findByChannelIdAndDate(channelId, dateStr);
      
      if (!existing) {
        LiveStreamMetrics.create({
          channel_id: channelId,
          date: dateStr,
          total_live_stream_views: views,
          live_stream_count: streamCount,
          peak_video_id: null
        });
        console.log(`   ✓ ${dateStr}: ${views.toLocaleString()} views, ${streamCount} streams`);
      } else {
        console.log(`   ⏭️  ${dateStr}: Already exists (${existing.total_live_stream_views.toLocaleString()} views)`);
      }
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Channel ID: ${channelId}`);
    console.log(`   - Date range: ${new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
    console.log(`   - Total days: 36`);
    console.log('\nYou can now run: npm run test:vsi-report');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

seedTestData();
