# Daily VSI Discord Reports

This feature provides automated daily Discord webhook delivery of VSI (Viewer Sentiment Index) metrics.

## Overview

The system automatically sends a comprehensive VSI report to Discord every day at 8:00 AM UTC. The report includes the previous day's VSI data, trend comparison, and a 30-day chart visualization.

## Features

- **Automated Scheduling**: Runs daily at 8:00 AM UTC using node-cron
- **Rich Discord Embeds**: Professional formatting with color-coded indicators
- **Trend Analysis**: Compares current VSI with previous day
- **Visual Charts**: 30-day VSI trend chart with peak views overlay
- **Error Handling**: Graceful error handling with Discord notifications
- **Manual Testing**: Test report generation on-demand

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# Discord Integration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
ENABLE_VSI_REPORTS=true
```

- **DISCORD_WEBHOOK_URL**: Discord webhook URL for sending reports (required)
- **ENABLE_VSI_REPORTS**: Set to `false` to disable scheduled reports (default: `true`)

### Discord Webhook Setup

1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Create a new webhook or use an existing one
4. Copy the webhook URL
5. Add it to your `.env` file

## Usage

### Automatic Schedule

Once configured, reports are automatically sent daily at 8:00 AM UTC when the application is running.

The scheduler starts automatically when you run:

```bash
npm start
```

### Manual Testing

To test the Discord report immediately:

```bash
npm run test:vsi-report
```

This will:
1. Generate a report for yesterday's date
2. Create a 30-day trend chart
3. Send the report to Discord immediately
4. Display the results in the console

### Development Testing

To seed test data for development:

```bash
npm run seed:test-data
```

This creates 36 days of sample metrics data for testing.

## Report Contents

Each daily report includes:

### Discord Embed Fields

1. **Date** - The date of the reported data (YYYY-MM-DD format)
2. **VSI** - The VSI value with sentiment label (e.g., "69.22 (Normal)")
3. **Peak Views** - Highest concurrent live stream views for that day
4. **Trend** - Comparison to previous day with emoji indicators:
   - 📈 VSI up (increase > 0.5%)
   - 📉 VSI down (decrease > 0.5%)
   - ➡️ VSI stable (change ≤ 0.5%)

### Chart Visualization

- 30-day VSI trend line chart
- Peak views overlay (normalized to 0-100 scale)
- Dark theme optimized for Discord
- Image attached to embed

### Color Coding

The embed color reflects the VSI sentiment:
- **Dark Green** (#16a34a): VSI ≤ 10 (Extreme Disinterest)
- **Light Green** (#4ade80): VSI 10-30 (Low Interest)
- **Gray** (#9ca3af): VSI 30-70 (Normal)
- **Orange** (#fb923c): VSI 70-90 (High Interest)
- **Red** (#dc2626): VSI > 90 (Extreme Hype)

## Architecture

### Components

1. **VsiCalculator** (`src/services/vsiCalculator.js`)
   - Calculates VSI for specific dates
   - Computes trend comparisons
   - Retrieves historical data

2. **ChartGenerator** (`src/services/chartGenerator.js`)
   - Generates PNG chart images using chartjs-node-canvas
   - Creates 30-day VSI trend visualizations
   - Supports overlay with peak views data

3. **DiscordService** (`src/services/discordService.js`)
   - Sends rich embeds to Discord webhooks
   - Handles file attachments (chart images)
   - Sends error notifications

4. **DailyVsiReportScheduler** (`src/schedulers/dailyVsiReport.js`)
   - Orchestrates the report generation
   - Manages cron scheduling
   - Handles errors and logging

### Data Flow

1. Scheduler triggers at 8:00 AM UTC
2. Calculate previous day's date (since livestreams end at 2 PM UTC)
3. Query metrics from database (30 days of data)
4. Calculate VSI values using MA7 (7-day moving average)
5. Generate trend comparison with day before
6. Create chart image from historical data
7. Build Discord embed with all information
8. POST to Discord webhook with embed and chart attachment
9. Log success or send error notification

## Troubleshooting

### No Data Available

If you see "No VSI data available for yesterday":
- Ensure metrics collection is running and has collected data
- Check that there's at least 7 days of historical data for MA7 calculation
- Verify database contains metrics for the previous day

### Discord Connection Issues

If the Discord webhook fails:
- Verify the webhook URL is correct
- Check that the webhook hasn't been deleted in Discord
- Test the connection manually with `npm run test:vsi-report`

### Chart Generation Errors

If chart generation fails:
- Ensure chartjs-node-canvas is properly installed
- Check that there's sufficient historical data (at least 7 days)
- Review console logs for specific error messages

### Scheduler Not Running

If reports aren't being sent:
- Check that `ENABLE_VSI_REPORTS` is not set to `false`
- Verify `DISCORD_WEBHOOK_URL` is configured
- Check server logs for scheduler initialization messages
- Ensure the server process is running continuously

## Deployment

### Render Deployment

1. Add environment variables in Render dashboard:
   - `DISCORD_WEBHOOK_URL`
   - `ENABLE_VSI_REPORTS=true`

2. Deploy the application

3. The scheduler will start automatically when the app starts

4. Monitor logs to confirm daily reports are being sent

### Keeping the Service Running

The scheduler runs as part of the main application process. Ensure:
- The application is configured to restart on failure
- The process manager (Render, PM2, etc.) keeps the app running
- Logs are monitored for errors

## Dependencies

New dependencies added for this feature:

```json
{
  "node-cron": "^4.2.1",
  "chartjs-node-canvas": "^5.0.0",
  "axios": "^1.13.2"
}
```

## Testing

### Unit Testing

Test individual components:

```bash
# Test VSI calculation
node -e "const VsiCalculator = require('./src/services/vsiCalculator'); console.log(VsiCalculator.getVsiForDate('2025-11-08'));"

# Test chart generation (requires data)
npm run test:vsi-report
```

### Integration Testing

1. Seed test data: `npm run seed:test-data`
2. Run test report: `npm run test:vsi-report`
3. Check Discord channel for the message
4. Verify chart image and embed formatting

## Future Enhancements

Potential improvements:
- Multiple Discord channels for different reports
- Configurable schedule (not just 8 AM UTC)
- Weekly/monthly summary reports
- Customizable chart timeframes (7, 14, 30, 90 days)
- Discord slash commands for on-demand reports
- Historical VSI comparisons (week-over-week, month-over-month)

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify environment variables are set correctly
3. Test the Discord webhook manually
4. Review this documentation

## License

Same as parent project (MIT)
