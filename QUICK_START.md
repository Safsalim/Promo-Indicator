# Quick Start Guide - Database Setup

This guide will help you quickly set up and start using the YouTube Channels and Metrics database.

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure your settings:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
PORT=3000
NODE_ENV=development
DATABASE_PATH=./database/promo-indicator.db
```

## 3. Initialize Database

```bash
npm run init-db
```

This creates the SQLite database with all required tables including:
- `channels` - YouTube channel configurations
- `live_stream_metrics` - Daily live stream metrics
- Other tables for video tracking and promo indicators

## 4. (Optional) Add Sample Data

```bash
npm run seed:channels
```

This adds:
- 3 sample channels (2 active, 1 inactive)
- 7 days of sample metrics for testing

## 5. Test the Setup

```bash
npm run test:models
```

This runs comprehensive tests on all database models and operations.

## Quick Examples

### Working with Channels

```javascript
const { Channel } = require('./src/models');

// Create a new channel
const result = Channel.create({
  channel_handle: '@mychannel',
  channel_id: 'UCxxxxx',
  channel_name: 'My Channel',
  is_active: 1
});

// Find all active channels
const activeChannels = Channel.findActive();

// Find by handle
const channel = Channel.findByHandle('@mychannel');

// Update channel
Channel.update(channel.id, {
  channel_name: 'Updated Name'
});

// Deactivate channel
Channel.setActive(channel.id, false);
```

### Working with Metrics

```javascript
const { LiveStreamMetrics } = require('./src/models');

// Add today's metrics (or update if exists)
const today = new Date().toISOString().split('T')[0];
LiveStreamMetrics.createOrUpdate({
  channel_id: 1,
  date: today,
  total_live_stream_views: 5000,
  live_stream_count: 3
});

// Get metrics for a channel
const metrics = LiveStreamMetrics.findByChannelId(1);

// Get metrics for date range
const rangeMetrics = LiveStreamMetrics.findByChannelIdAndDateRange(
  1,
  '2024-01-01',
  '2024-01-31'
);

// Get summary statistics
const summary = LiveStreamMetrics.getMetricsSummaryByChannelId(1);
console.log(`Total views: ${summary.total_views}`);
console.log(`Average views: ${summary.avg_views}`);
```

## Database Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run init-db` | Initialize database with all tables |
| `npm run create-db` | Create fresh database with directory structure |
| `npm run migrate:channels` | Add/update channels and metrics tables |
| `npm run seed:channels` | Add sample test data |
| `npm run test:models` | Test all database models |

## Next Steps

1. Review [DATABASE.md](./DATABASE.md) for comprehensive documentation
2. Check [API.md](./API.md) for API endpoint information
3. See [README.md](./README.md) for full project documentation

## Common Tasks

### Add a New Channel for Tracking

```javascript
const { Channel } = require('./src/models');

Channel.create({
  channel_handle: '@ciidb',
  channel_id: 'UC...',  // Get from YouTube API
  channel_name: 'Channel Name',
  is_active: 1
});
```

### Record Daily Metrics

```javascript
const { LiveStreamMetrics } = require('./src/models');

const today = new Date().toISOString().split('T')[0];

LiveStreamMetrics.createOrUpdate({
  channel_id: 1,
  date: today,
  total_live_stream_views: 10000,
  live_stream_count: 5
});
```

### Query Metrics for Reporting

```javascript
const { LiveStreamMetrics } = require('./src/models');

// Last 7 days
const endDate = new Date().toISOString().split('T')[0];
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);
const startDateStr = startDate.toISOString().split('T')[0];

const metrics = LiveStreamMetrics.findByChannelIdAndDateRange(
  1,
  startDateStr,
  endDate
);

metrics.forEach(m => {
  console.log(`${m.date}: ${m.total_live_stream_views} views`);
});
```

## Troubleshooting

### Database Locked Error

If you get a "database is locked" error:
1. Ensure no other processes are accessing the database
2. Close all database connections properly
3. Restart your application

### Migration Issues

If migrations fail:
1. Check database file permissions
2. Verify the `database/` directory exists
3. Review the error message for SQL syntax issues

### Need Help?

- Check [DATABASE.md](./DATABASE.md) for detailed documentation
- Review the test script at `src/scripts/testModels.js` for examples
- Open an issue on the GitHub repository
