# Promo-Indicator

YouTube promotional analytics and monitoring dashboard for tracking video performance and detecting promotional activities.

## Features

- Real-time YouTube video analytics tracking
- Historical data visualization with Chart.js
- Promotional activity detection and indicators
- SQLite database for local data persistence
- RESTful API for data access
- Interactive dashboard for monitoring
- **Automated live stream metrics collection**
- **Historical data collection via dashboard UI or CLI**
- **Channel management via dashboard and CLI tools**
- **Scheduled data collection support**
- **Overlay Chart View** - Compare all sentiment indicators on one chart
  - Multi-axis visualization (YouTube Views, BTC Price, Fear & Greed Index)
  - Optional RSI overlay for sentiment correlation analysis
  - Normalization feature for percentage-based comparison
  - Interactive tooltips showing all metrics at once
- **Daily VSI Discord Reports** - Automated Discord webhook delivery
  - Scheduled daily reports at 8 AM UTC
  - Rich embeds with VSI metrics and trend analysis
  - 30-day chart visualization with peak views overlay
  - Color-coded sentiment indicators
  - See [DISCORD_VSI_REPORTS.md](./DISCORD_VSI_REPORTS.md) for details

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **better-sqlite3** - SQLite database driver (synchronous, high-performance)
- **googleapis** - YouTube Data API v3 client
- **dotenv** - Environment variable management
- **node-cron** - Task scheduler for automated reports
- **chartjs-node-canvas** - Server-side chart image generation
- **axios** - HTTP client for Discord webhook integration

### Frontend
- **HTML/CSS/JavaScript** - Static dashboard
- **Chart.js** - Data visualization library
- **React** (optional) - Component structure for future development

### Database
- **SQLite** - Lightweight, serverless database

## Project Structure

```
promo-indicator/
├── src/
│   ├── models/           # Database models and schema
│   │   ├── schema.js
│   │   ├── Video.js
│   │   └── VideoStats.js
│   ├── routes/           # API route handlers
│   │   ├── youtube.js
│   │   └── promo.js
│   ├── services/         # Business logic and data collection
│   │   ├── youtubeService.js
│   │   └── promoService.js
│   ├── config/           # Configuration files
│   │   ├── database.js
│   │   └── youtube.js
│   ├── scripts/          # Utility scripts
│   │   └── initDatabase.js
│   └── app.js            # Main application entry point
├── frontend/
│   ├── public/           # Static frontend files
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── src/              # React components (optional future development)
│       ├── components/
│       └── pages/
├── database/             # SQLite database storage
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- **YouTube Data API v3 Key** - [Get API Key](https://console.developers.google.com/)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd promo-indicator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Edit the `.env` file and add your YouTube API credentials:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
PORT=3000
NODE_ENV=development
DATABASE_PATH=./database/promo-indicator.db
YOUTUBE_API_QUOTA_LIMIT=10000

# Discord Integration (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
ENABLE_VSI_REPORTS=true
```

**Note:** Discord integration is optional. If you want daily VSI reports sent to Discord, set up a Discord webhook and configure the URL. See [DISCORD_VSI_REPORTS.md](./DISCORD_VSI_REPORTS.md) for details.

### 4. Initialize the database

```bash
npm run init-db
```

This will create the SQLite database and set up the required tables.

## Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

## Usage

### Development Mode

Start the server with auto-reload on file changes:

```bash
npm run dev
```

### Production Mode

Start the server:

```bash
npm start
```

The server will run on `http://localhost:3000` (or the port specified in your `.env` file).

### Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

## API Endpoints

### YouTube API Routes

- `GET /api/youtube/video/:videoId` - Get video details
- `GET /api/youtube/channel/:channelId` - Get channel details
- `GET /api/youtube/channel/:channelId/videos` - Get channel videos
- `GET /api/youtube/search?q=query` - Search videos

### Promo Analysis Routes

- `GET /api/promo/videos` - Get all tracked videos
- `GET /api/promo/stats/:videoId` - Get video statistics history
- `GET /api/promo/analyze/:videoId` - Analyze promo indicators
- `GET /api/promo/indicators/:videoId` - Get saved promo indicators
- `POST /api/promo/indicators` - Save new promo indicator

### Dashboard API Routes

- `GET /api/channels` - List all tracked channels with metadata
- `POST /api/channels` - Add a new channel to track (automatically resolves YouTube handle)
- `GET /api/metrics` - Query live stream metrics with filters (channel_ids, start_date, end_date, limit)
- `GET /api/metrics/summary` - Get aggregated summary statistics with trends and channel breakdowns
- `POST /api/collect-metrics` - Trigger historical data collection (start_date, end_date, channel_ids)

For detailed documentation, see [DASHBOARD_API.md](./DASHBOARD_API.md).

### Health Check

- `GET /api/health` - API health status

## Database Schema

### Tables

#### videos
- `id` (TEXT) - YouTube video ID
- `channel_id` (TEXT) - YouTube channel ID
- `title` (TEXT) - Video title
- `description` (TEXT) - Video description
- `published_at` (DATETIME) - Publish date
- `thumbnail_url` (TEXT) - Thumbnail URL
- `created_at` (DATETIME) - Record creation time
- `updated_at` (DATETIME) - Record update time

#### video_stats
- `id` (INTEGER) - Primary key
- `video_id` (TEXT) - Reference to videos table
- `view_count` (INTEGER) - View count
- `like_count` (INTEGER) - Like count
- `comment_count` (INTEGER) - Comment count
- `recorded_at` (DATETIME) - Timestamp of recording

#### promo_indicators
- `id` (INTEGER) - Primary key
- `video_id` (TEXT) - Reference to videos table
- `indicator_type` (TEXT) - Type of indicator
- `indicator_value` (REAL) - Numeric value of indicator
- `detected_at` (DATETIME) - Detection timestamp
- `notes` (TEXT) - Additional notes

#### channels
- `id` (INTEGER) - Primary key, auto-increment
- `channel_handle` (TEXT) - YouTube handle (e.g., "@ciidb"), unique
- `channel_id` (TEXT) - YouTube channel ID from API
- `channel_name` (TEXT) - Channel display name
- `added_date` (DATETIME) - When channel was added
- `is_active` (INTEGER) - Enable/disable tracking (1 or 0)

#### live_stream_metrics
- `id` (INTEGER) - Primary key, auto-increment
- `channel_id` (INTEGER) - Foreign key to channels.id
- `date` (TEXT) - Date of metrics (YYYY-MM-DD), indexed
- `total_live_stream_views` (INTEGER) - Cumulative views for all live streams that day
- `live_stream_count` (INTEGER) - Number of live streams detected
- `created_at` (DATETIME) - Record creation timestamp
- **Unique constraint** on (channel_id, date)

For detailed database documentation, see [DATABASE.md](./DATABASE.md).

## Live Stream Metrics Collection

### Channel Management

Use the channel management CLI to add and manage YouTube channels for tracking:

#### List all channels
```bash
npm run manage-channels list
```

#### Add a new channel
```bash
npm run manage-channels add @channelhandle
```

Example:
```bash
npm run manage-channels add @ciidb
```

The tool will automatically fetch the channel's YouTube ID and name from the API.

#### Enable/disable channel tracking
```bash
# Disable tracking
npm run manage-channels disable 1

# Enable tracking
npm run manage-channels enable 1
```

#### View channel information
```bash
npm run manage-channels info 1
```

#### Delete a channel
```bash
npm run manage-channels delete 1
```

**Warning:** Deleting a channel also removes all associated metrics data.

### Collecting Metrics

The metrics collection tool fetches live stream view counts from YouTube and stores them in the database.

#### Two ways to collect data:

**Option 1: Using the Dashboard (Easiest)**
1. Open the dashboard at `http://localhost:3000`
2. Add channels you want to track
3. Use the "Collect Historical Data" section
4. Select a date range and click "Collect Data"
5. The dashboard will automatically refresh with the new data

**Option 2: Using Command Line**

#### Collect metrics for yesterday (default)
```bash
npm run collect-metrics
```

#### Collect historical data for a specific date
```bash
npm run collect-metrics -- --start-date 2024-10-15
```

#### Collect historical data for a date range
```bash
# Collect last 30 days
npm run collect-metrics -- --start-date 2024-10-01 --end-date 2024-10-31

# Collect last 90 days
npm run collect-metrics -- --start-date 2024-08-01 --end-date 2024-10-31
```

#### Collect for specific channels only
```bash
npm run collect-metrics -- --channels 1,2,3
```

#### Dry run (preview without saving)
```bash
npm run collect-metrics -- --dry-run
```

#### Combine options
```bash
npm run collect-metrics -- -s 2024-01-01 -e 2024-01-07 -c 1,2 -d
```

#### Recalculate existing data with peak aggregation
After the peak view aggregation fix, you may need to recalculate existing data:

```bash
# Recalculate with verbose logging showing before/after values
npm run recalculate-metrics -- --start-date 2024-08-01 --end-date 2024-11-01 --verbose
```

The `--verbose` flag shows:
- Confirmation that MAX aggregation is being used (not SUM)
- Before/after values for changed dates
- Which video had the peak views on days with multiple streams

**Example output:**
```
📊 Using MAX (peak) aggregation for view counts (not SUM)
🔄 Updated: Date=2024-08-28
   Views: 540 → 285 (-255)
```

See [PEAK_VIEWS_MIGRATION.md](./PEAK_VIEWS_MIGRATION.md) for details on the peak view aggregation change.

#### Tips for collecting historical data:
- **First-time setup**: Collect the last 30-90 days to build a baseline
- **Date range limit**: Keep ranges reasonable (30-90 days) to avoid API quota issues
- **Incremental collection**: After initial setup, run daily collection via cron/scheduler
- **API quota**: YouTube API has daily quotas - large date ranges may hit limits

#### Command-line options
- `-s, --start-date DATE` - Start date (YYYY-MM-DD, default: yesterday)
- `-e, --end-date DATE` - End date (YYYY-MM-DD, default: same as start date)
- `-c, --channels IDS` - Comma-separated channel IDs to process (default: all active)
- `-d, --dry-run` - Run without saving data (preview mode)
- `-h, --help` - Show help message

### Automated Scheduling

#### Linux/macOS (cron)

Edit your crontab:
```bash
crontab -e
```

Add a daily collection job (runs at 2 AM every day):
```cron
0 2 * * * cd /path/to/promo-indicator && /usr/bin/npm run collect-metrics >> /path/to/logs/collection.log 2>&1
```

Weekly collection for the past 7 days (runs every Monday at 3 AM):
```cron
0 3 * * 1 cd /path/to/promo-indicator && /usr/bin/npm run collect-metrics -- --start-date $(date -d '7 days ago' +\%Y-\%m-\%d) --end-date $(date -d '1 day ago' +\%Y-\%m-\%d) >> /path/to/logs/collection-weekly.log 2>&1
```

#### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create a new task with the following settings:
   - **Trigger**: Daily at 2:00 AM
   - **Action**: Start a program
   - **Program/script**: `cmd.exe`
   - **Arguments**: `/c cd /d C:\path\to\promo-indicator && npm run collect-metrics >> logs\collection.log 2>&1`

#### Using systemd (Linux)

Create a service file `/etc/systemd/system/livestream-collector.service`:
```ini
[Unit]
Description=Live Stream Metrics Collection
After=network.target

[Service]
Type=oneshot
User=yourusername
WorkingDirectory=/path/to/promo-indicator
ExecStart=/usr/bin/npm run collect-metrics
StandardOutput=append:/var/log/livestream-collector.log
StandardError=append:/var/log/livestream-collector.log

[Install]
WantedBy=multi-user.target
```

Create a timer file `/etc/systemd/system/livestream-collector.timer`:
```ini
[Unit]
Description=Daily Live Stream Metrics Collection
Requires=livestream-collector.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start the timer:
```bash
sudo systemctl daemon-reload
sudo systemctl enable livestream-collector.timer
sudo systemctl start livestream-collector.timer

# Check timer status
sudo systemctl status livestream-collector.timer
```

#### Docker/Container Environments

If running in a container, use the container's scheduling mechanism or an external scheduler like Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: livestream-collector
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: collector
            image: promo-indicator:latest
            command: ["npm", "run", "collect-metrics"]
          restartPolicy: OnFailure
```

### Logging and Monitoring

The collection tool provides comprehensive logging:

- **Successful collections**: Channel, date, view counts, and stream counts
- **Errors**: Channel identification, error messages, and reasons for failure
- **Summary report**: Total channels processed, successful/failed counts

Logs include:
- Collection start/end times
- Processed channels and dates
- API errors and rate limiting issues
- Database insertion confirmations

Example log output:
```
============================================================
Live Stream Metrics Collection
============================================================
Date range: 2024-01-15 to 2024-01-15
============================================================
Processing 2 active channel(s)...

Processing channel ID 1 (UC1234567890abcdefg)...
Date range: 2024-01-15 to 2024-01-15
Found 3 potential live stream(s).
Processing 1 date(s) with live stream data.
✓ Stored: Date=2024-01-15, Views=5000, Count=3

============================================================
Collection Summary
============================================================
Total channels: 2
Successful: 2
Failed: 0
============================================================
```

## Development

### Adding New Features

1. **Models**: Add new database models in `src/models/`
2. **Services**: Add business logic in `src/services/`
3. **Routes**: Add API endpoints in `src/routes/`
4. **Frontend**: Update dashboard in `frontend/public/`

### Database Migrations

To initialize or update the database schema:

```bash
# Initialize database with all tables
npm run init-db

# Or create a fresh database
npm run create-db

# Run specific migration for channels and metrics tables
npm run migrate:channels

# Seed database with sample data for testing
npm run seed:channels

# Test database models and CRUD operations
npm run test:models
```

**Available Scripts:**
- `init-db` - Initialize database schema (creates all tables)
- `create-db` - Create database with proper directory structure
- `migrate:channels` - Add channels and live_stream_metrics tables
- `seed:channels` - Populate database with sample data
- `test:models` - Run model tests to verify functionality

**Note**: Schema initialization scripts use `CREATE TABLE IF NOT EXISTS`, so they're safe to run multiple times. For detailed database documentation, migration guides, and usage examples, see [DATABASE.md](./DATABASE.md).

## YouTube API Integration

The project includes a comprehensive YouTube Data API v3 integration with advanced features:

### Features

- ✅ **Channel Handle Resolution** - Convert @handles to channel IDs
- ✅ **Live Stream Fetching** - Search and filter live streams by date
- ✅ **Video Statistics** - Get view counts, likes, and comments
- ✅ **Pagination Support** - Automatically handle large result sets
- ✅ **Error Handling** - Categorized errors (quota, auth, network, etc.)
- ✅ **Rate Limiting** - Prevent exceeding API quotas
- ✅ **Retry Logic** - Automatic retries with exponential backoff
- ✅ **Quota Tracking** - Monitor API usage in real-time

### Usage Examples

Run the interactive example:
```bash
npm run example:youtube-api
```

Run the unit tests:
```bash
npm run test:youtube-api
```

### Quick Start

```javascript
const { YouTubeApiClient } = require('./src/services/youtubeApiClient');
const client = new YouTubeApiClient();

// Resolve channel handle
const { channelId, channelTitle } = await client.resolveChannelHandle('@ciidb');

// Get live stream view counts for a date
const viewData = await client.getLiveStreamViewCounts(channelId, '2024-01-15');
console.log(`Total Views: ${viewData.totalViews}`);
console.log(`Stream Count: ${viewData.streamCount}`);

// Check quota usage
const quota = client.getQuotaUsage();
console.log(`Used: ${quota.used} / ${quota.limit}`);
```

### Documentation

For complete API documentation, see [YOUTUBE_API.md](./YOUTUBE_API.md), which includes:
- API authentication setup
- Error handling strategies
- Quota management best practices
- Complete code examples
- Troubleshooting guide

## YouTube API Quota

The YouTube Data API has a quota limit of 10,000 units per day by default. Different operations cost different amounts:

- Video details: 1 unit
- Search: 100 units
- Channel details: 1 unit

The API client automatically tracks quota usage and prevents exceeding limits. Monitor your usage:

```bash
# Check quota usage after running operations
npm run test:youtube-api
```

You can also monitor usage in the [Google Cloud Console](https://console.developers.google.com/).

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

For issues and questions, please open an issue on the GitHub repository.

## Roadmap

- [x] Automated data collection scheduler
- [x] Live stream metrics collection
- [x] Channel management CLI
- [ ] Email notifications for promotional spikes
- [ ] Multi-channel comparison dashboard
- [ ] Export data to CSV/JSON
- [ ] User authentication
- [ ] React-based frontend with routing
- [ ] Real-time WebSocket updates
- [ ] Advanced analytics and ML-based predictions
- [ ] Automated anomaly detection for view spikes
