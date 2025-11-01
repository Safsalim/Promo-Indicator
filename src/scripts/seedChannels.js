require('dotenv').config();
const { Channel, LiveStreamMetrics } = require('../models');
const { closeDatabase } = require('../config/database');

console.log('Seeding channels and metrics data...');

try {
  const sampleChannels = [
    {
      channel_handle: '@ciidb',
      channel_id: 'UCxxxxxxxxxxxxxx',
      channel_name: 'CII Database Channel',
      is_active: 1
    },
    {
      channel_handle: '@techtalks',
      channel_id: 'UCyyyyyyyyyyyyyy',
      channel_name: 'Tech Talks Channel',
      is_active: 1
    },
    {
      channel_handle: '@livestreampro',
      channel_id: 'UCzzzzzzzzzzzzzz',
      channel_name: 'LiveStream Pro',
      is_active: 0
    }
  ];

  console.log('Creating sample channels...');
  const channelIds = [];
  for (const channelData of sampleChannels) {
    try {
      const result = Channel.create(channelData);
      channelIds.push(result.lastInsertRowid);
      console.log(`  ✓ Created channel: ${channelData.channel_handle} (ID: ${result.lastInsertRowid})`);
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        console.log(`  • Channel ${channelData.channel_handle} already exists`);
        const existing = Channel.findByHandle(channelData.channel_handle);
        if (existing) {
          channelIds.push(existing.id);
        }
      } else {
        throw error;
      }
    }
  }

  console.log('\nCreating sample metrics...');
  const today = new Date();
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  for (const channelId of channelIds.slice(0, 2)) {
    for (const date of dates) {
      const metricsData = {
        channel_id: channelId,
        date: date,
        peak_live_stream_views: Math.floor(Math.random() * 10000) + 1000,
        live_stream_count: Math.floor(Math.random() * 5) + 1
      };

      try {
        LiveStreamMetrics.createOrUpdate(metricsData);
        console.log(`  ✓ Added metrics for channel ${channelId} on ${date}`);
      } catch (error) {
        console.error(`  ✗ Error adding metrics for channel ${channelId} on ${date}:`, error.message);
      }
    }
  }

  console.log('\nSeed data created successfully!');
  console.log(`Total channels: ${Channel.count()}`);
  console.log(`Active channels: ${Channel.countActive()}`);
} catch (error) {
  console.error('Error seeding data:', error);
  process.exit(1);
} finally {
  closeDatabase();
}
