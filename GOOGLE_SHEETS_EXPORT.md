# Google Sheets Export Feature

This feature allows you to fetch YouTube livestream data and export it directly to Google Sheets.

## Overview

The `fetchCiidbToSheet.js` script fetches all livestreams from the @ciidb YouTube channel since November 9, 2024, and populates a Google Sheet with:
- Livestream Date
- Video URL
- Views Count

## Setup

### 1. Google Cloud Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create a Service Account:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Grant appropriate roles (e.g., "Editor")
   - Click "Done"
5. Create a Key:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose "JSON" format
   - Download the JSON file

### 2. Share Google Sheet with Service Account

1. Open your Google Sheet
2. Click "Share" button
3. Add the service account email (e.g., `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`)
4. Grant "Editor" permissions
5. Click "Send"

### 3. Configure Environment Variables

Add one of the following to your `.env` file:

**Option 1: Full JSON credentials (recommended for deployment)**
```bash
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"direct-plasma-478317-p1","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**Option 2: Path to credentials file (recommended for local development)**
```bash
GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json
```

Then place your downloaded JSON file at the specified path.

### 4. YouTube API Key

Ensure your YouTube API key is configured:
```bash
YOUTUBE_API_KEY=your_youtube_api_key_here
```

## Usage

### Run the Script

```bash
npm run fetch-ciidb-to-sheet
```

### What It Does

1. **Resolves Channel**: Looks up @ciidb channel ID
2. **Fetches Videos**: Gets all videos published since 2024-11-09
3. **Filters Livestreams**: Identifies actual livestreams (filters out regular videos, upcoming streams)
4. **Gets Statistics**: Fetches view counts and metadata
5. **Checks Duplicates**: Compares with existing sheet data
6. **Updates Sheet**: Adds new livestreams (skips duplicates)

### Output Example

```
🚀 Starting @ciidb Livestream Data Collection

📺 Resolving channel: @ciidb
✅ Found channel: CIIDB (UCxxxxxxxxxxxx)

📅 Fetching livestreams from 2024-11-09 to 2024-11-17
🔍 Found 25 videos in the date range

📊 Fetching detailed statistics for 25 videos...

🎯 Filtering for actual livestreams:

  ✓ 2024-11-09 | 1,234 views | Weekly Livestream #1
  ✓ 2024-11-10 | 2,456 views | Weekly Livestream #2
  ✗ Skipped: Upcoming Stream (upcoming, public)

📈 Summary:
   Total videos found: 25
   Actual livestreams: 15
   Filtered out: 10

✍️  Appending 15 new livestreams...
✅ Successfully appended 15 new livestreams

🎉 Task completed successfully!
   View the sheet at: https://docs.google.com/spreadsheets/d/...

📋 Quota Usage:
   Used: 201 / 10000 (2.01%)
   Remaining: 9799
```

## Features

### Duplicate Prevention
The script automatically checks for existing entries by comparing video URLs and only adds new livestreams.

### Data Validation
- Only includes videos that were actual livestreams (have `liveStreamingDetails.actualStartTime`)
- Only includes public videos
- Filters out upcoming streams
- Filters out regular videos that were never streamed

### Error Handling
- Validates API keys and credentials
- Provides detailed error messages
- Tracks YouTube API quota usage
- Handles rate limiting automatically

### Data Formatting
- Dates in YYYY-MM-DD format
- View counts as numbers (for easy sorting/filtering in Sheets)
- Sorted by date (oldest first)
- Clean column headers

## Troubleshooting

### "Google Sheets credentials not found"
Make sure you've set either `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_CREDENTIALS_PATH` in your `.env` file.

### "The caller does not have permission"
1. Verify the service account email has been added to the Google Sheet with Editor permissions
2. Check that the Google Sheets API is enabled in your Google Cloud project

### "YouTube API key is missing"
Set the `YOUTUBE_API_KEY` environment variable in your `.env` file.

### "Channel not found"
Verify the channel handle is correct. The script uses `@ciidb` by default.

## Customization

To modify the script for different channels or date ranges, edit `/home/engine/project/src/scripts/fetchCiidbToSheet.js`:

```javascript
const CIIDB_HANDLE = '@your-channel-handle';  // Change channel
const START_DATE = '2024-11-09';               // Change start date
const SHEET_URL = 'https://...';               // Change sheet URL
```

## API Quota Usage

Each run typically uses:
- 1 quota unit for channel lookup
- 100 quota units per search page (usually 1-2 pages)
- 1 quota unit for video statistics

Total: ~102-202 quota units per run (depending on number of videos)

Daily YouTube API quota limit: 10,000 units (configurable via `YOUTUBE_API_QUOTA_LIMIT`)

## Files

- `/src/scripts/fetchCiidbToSheet.js` - Main script
- `/src/config/googleSheets.js` - Google Sheets API client
- `/src/services/youtubeApiClient.js` - YouTube API client (existing)

## Related Documentation

- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)
