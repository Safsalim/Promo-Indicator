# Getting Started with Google Sheets Export

This guide will help you set up and run the @ciidb livestream export to Google Sheets.

## 📋 Overview

This feature exports YouTube livestream data from the @ciidb channel directly to a Google Sheet with:
- Livestream Date (YYYY-MM-DD)
- Video URL (full YouTube link)
- Views Count (current view count)

Target Sheet: [View Google Sheet](https://docs.google.com/spreadsheets/d/18MJllYCK717LannQHktc1oz3EJy2aCSNbgh5LEShzQU/edit?gid=857080924#gid=857080924)

## 🚀 Quick Start (3 Steps)

### 1. Get Credentials

You need the complete Google service account JSON file. The ticket mentions:
- Project: `direct-plasma-478317-p1`
- Email: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`

**Get the credentials:**
- Request from your team, or
- Download from [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=direct-plasma-478317-p1)

### 2. Configure

**Option A: Environment Variable**
```bash
# Create .env file
cp .env.example .env

# Add this line to .env
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"direct-plasma-478317-p1",...}'
```

**Option B: File Path**
```bash
# Save credentials to file
cat > config/google-credentials.json << EOF
{your credentials JSON}
EOF

# Add this line to .env
GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json
```

### 3. Share Sheet & Run

```bash
# Share Google Sheet with service account email:
# cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com
# (Editor permissions required)

# Test setup
npm run test:google-sheets

# Run export
npm run fetch-ciidb-to-sheet
```

## 📚 Documentation

Detailed guides available:

| Document | Purpose |
|----------|---------|
| **[QUICKSTART_CIIDB_EXPORT.md](./QUICKSTART_CIIDB_EXPORT.md)** | Step-by-step walkthrough with examples |
| **[SETUP_GOOGLE_SHEETS.md](./SETUP_GOOGLE_SHEETS.md)** | Complete setup instructions |
| **[GOOGLE_SHEETS_EXPORT.md](./GOOGLE_SHEETS_EXPORT.md)** | Feature documentation and API details |
| **[CREDENTIALS_NEEDED.md](./CREDENTIALS_NEEDED.md)** | What credentials are required and how to get them |
| **[IMPLEMENTATION_CIIDB_GOOGLE_SHEETS.md](./IMPLEMENTATION_CIIDB_GOOGLE_SHEETS.md)** | Technical implementation details |

## ✅ What's Implemented

- ✅ Google Sheets API client with authentication
- ✅ YouTube API integration for fetching livestreams
- ✅ Export script with duplicate prevention
- ✅ Configuration testing utility
- ✅ Comprehensive error handling
- ✅ Progress reporting and quota tracking
- ✅ Data validation and filtering
- ✅ NPM scripts for easy execution
- ✅ Security (credentials excluded from git)
- ✅ Complete documentation

## 🔧 Commands

```bash
# Test Google Sheets configuration
npm run test:google-sheets

# Export @ciidb livestreams to sheet
npm run fetch-ciidb-to-sheet

# Other useful commands
npm run manage-channels         # Manage YouTube channels
npm run collect-metrics         # Collect YouTube metrics
```

## ⚠️ Requirements

Before running:
1. ✅ YouTube API key in `.env` (already configured)
2. ⏳ Google service account credentials (need private key)
3. ⏳ Google Sheet shared with service account email

## 🎯 Expected Output

```
🚀 Starting @ciidb Livestream Data Collection

📺 Resolving channel: @ciidb
✅ Found channel: CIIDB (UCxxxxxxxxxxxx)

📅 Fetching livestreams from 2024-11-09 to 2024-11-17
🔍 Found 25 videos in the date range

📊 Fetching detailed statistics for 25 videos...

🎯 Filtering for actual livestreams:
  ✓ 2024-11-09 | 1,234 views | Title
  ✓ 2024-11-10 | 2,456 views | Title
  ...

📈 Summary:
   Total videos found: 25
   Actual livestreams: 15
   Filtered out: 10

✍️  Appending 15 new livestreams...
✅ Successfully appended 15 new livestreams

🎉 Task completed successfully!
```

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| "Google Sheets credentials not found" | Set `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_CREDENTIALS_PATH` in `.env` |
| "The caller does not have permission" | Share sheet with service account email (Editor permissions) |
| "YouTube API key is missing" | Add `YOUTUBE_API_KEY` to `.env` |
| "Channel not found" | Verify API key and quota limits |

## 📊 Data Flow

```
1. Resolve @ciidb → YouTube Channel ID
2. Search videos (Nov 9, 2024 → Today)
3. Filter for actual livestreams
4. Get video statistics (views, etc.)
5. Check existing sheet data
6. Add only new entries (skip duplicates)
7. Report results
```

## 🔐 Security

- Credentials are **never committed** to git
- `.gitignore` configured to exclude credential files
- Use environment variables in production
- Service account has limited permissions (Sheets only)

## 💡 Features

- **Automatic duplicate detection** - Run safely multiple times
- **Smart filtering** - Only actual livestreams (no regular videos)
- **Date range** - All livestreams since Nov 9, 2024
- **Public videos only** - Skips private/unlisted content
- **Quota tracking** - Monitors YouTube API usage
- **Error handling** - Clear messages for common issues

## 🔄 Running Multiple Times

The script is designed to run multiple times safely:
- **First run**: Creates headers and adds all livestreams
- **Later runs**: Adds only new livestreams (skips existing)
- **No overwrites**: Existing data is preserved

Run daily/weekly to keep the sheet updated!

## 📞 Need Help?

1. Check [QUICKSTART_CIIDB_EXPORT.md](./QUICKSTART_CIIDB_EXPORT.md)
2. Run `npm run test:google-sheets` for diagnostics
3. Review error messages - they're designed to be helpful
4. See [CREDENTIALS_NEEDED.md](./CREDENTIALS_NEEDED.md) for credential help

## 🎉 Summary

Everything is implemented and ready! Just need to:
1. Get the service account private key
2. Configure credentials in `.env`
3. Share the Google Sheet
4. Run the script

That's it! 🚀

---

**Implementation Status**: ✅ Complete (awaiting credentials)  
**Documentation Status**: ✅ Complete  
**Code Status**: ✅ Syntax validated  
**Branch**: `feat/ciidb-livestreams-to-sheet-since-2024-11-09`
