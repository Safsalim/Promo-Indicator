# Quick Start: Export @ciidb Livestreams to Google Sheet

## Prerequisites Checklist

- [ ] YouTube API key is configured in `.env` file
- [ ] Google service account credentials are obtained (see `CREDENTIALS_NEEDED.md`)
- [ ] Google Sheet is shared with service account email
- [ ] Dependencies are installed (`npm install`)

## Step-by-Step Guide

### 1. Get Service Account Credentials

You need the **complete service account JSON** with the private key. Contact your team member or:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Switch to project: `direct-plasma-478317-p1`
3. Navigate to: IAM & Admin → Service Accounts
4. Find: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`
5. Create a new key (JSON format) and download

### 2. Configure Credentials

Create a `.env` file in the project root if it doesn't exist:

```bash
cp .env.example .env
```

Add your credentials (choose one method):

**Method A: Environment Variable (Recommended)**
```env
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"direct-plasma-478317-p1","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com",...}'
```

**Method B: File Path**
```env
GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json
```

Then save your credentials JSON file to `config/google-credentials.json`.

### 3. Share Google Sheet

1. Open: https://docs.google.com/spreadsheets/d/18MJllYCK717LannQHktc1oz3EJy2aCSNbgh5LEShzQU/edit
2. Click **Share** (top right)
3. Add: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`
4. Set permission: **Editor**
5. Uncheck "Notify people"
6. Click **Share**

### 4. Test Configuration

```bash
npm run test:google-sheets
```

Expected output:
```
🧪 Testing Google Sheets Setup

1. Checking environment variables...
   ✓ GOOGLE_SERVICE_ACCOUNT_JSON is set
   ✓ JSON is valid
   ✓ Project: direct-plasma-478317-p1
   ✓ Email: cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com

2. Testing Google Sheets client initialization...
   ✓ Client initialized successfully

3. Testing URL parsing...
   ✓ Spreadsheet ID: 18MJllYCK717LannQHktc1oz3EJy2aCSNbgh5LEShzQU
   ✓ Sheet ID: 857080924

✅ All setup tests passed!
```

### 5. Run the Export

```bash
npm run fetch-ciidb-to-sheet
```

Expected output:
```
🚀 Starting @ciidb Livestream Data Collection

📺 Resolving channel: @ciidb
✅ Found channel: CIIDB (UCxxxxxxxxxxxx)

📅 Fetching livestreams from 2024-11-09 to 2024-11-17
🔍 Found X videos in the date range

📊 Fetching detailed statistics for X videos...

🎯 Filtering for actual livestreams:
  ✓ 2024-11-09 | 1,234 views | Title...
  ✓ 2024-11-10 | 2,456 views | Title...

📈 Summary:
   Total videos found: X
   Actual livestreams: X
   Filtered out: X

✍️  Appending X new livestreams...
✅ Successfully appended X new livestreams

🎉 Task completed successfully!
   View the sheet at: https://docs.google.com/spreadsheets/d/...

📋 Quota Usage:
   Used: 102 / 10000 (1.02%)
   Remaining: 9898
```

### 6. Verify Results

Open the Google Sheet and verify:
- Headers exist: "Livestream Date", "Video URL", "Views Count"
- Data is sorted by date (oldest first)
- Dates are in YYYY-MM-DD format
- URLs are complete (https://www.youtube.com/watch?v=...)
- View counts are numbers

## Common Issues

### ❌ "Google Sheets credentials not found"

**Solution**: Make sure `.env` file exists and contains either:
- `GOOGLE_SERVICE_ACCOUNT_JSON` with the full JSON credentials, or
- `GOOGLE_CREDENTIALS_PATH` pointing to a valid credentials file

### ❌ "The caller does not have permission"

**Solution**: 
1. Verify the Google Sheet is shared with the service account email
2. Make sure the permission level is "Editor" (not "Viewer")
3. Check that you're using the correct spreadsheet ID

### ❌ "YouTube API key is missing"

**Solution**: Add `YOUTUBE_API_KEY` to your `.env` file

### ❌ "Channel not found for handle: @ciidb"

**Solution**: 
1. Verify the YouTube API key is valid
2. Check you have remaining quota (run a few hours later if quota exceeded)
3. Verify the channel handle is correct

## Running Again

The script is safe to run multiple times:
- **First run**: Creates headers and adds all livestreams
- **Subsequent runs**: Only adds new livestreams (skips duplicates)
- **No data loss**: Existing entries are preserved

You can run it daily/weekly to keep the sheet updated with new livestreams.

## What Gets Exported

- **Only actual livestreams** (not regular videos or upcoming streams)
- **Only public videos** (skips private/unlisted)
- **Since 2024-11-09** (hardcoded start date)
- **Up to current date** (automatically uses today as end date)

## Manual Customization

To change the date range or channel, edit `src/scripts/fetchCiidbToSheet.js`:

```javascript
const CIIDB_HANDLE = '@ciidb';        // Change channel
const START_DATE = '2024-11-09';      // Change start date
const SHEET_URL = 'https://...';      // Change target sheet
```

Then run the script again.

## Need Help?

See detailed documentation:
- `SETUP_GOOGLE_SHEETS.md` - Complete setup guide
- `GOOGLE_SHEETS_EXPORT.md` - Feature documentation
- `CREDENTIALS_NEEDED.md` - Credential requirements
- `IMPLEMENTATION_CIIDB_GOOGLE_SHEETS.md` - Technical details

## Summary Commands

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env

# 3. Edit .env and add credentials
nano .env

# 4. Test configuration
npm run test:google-sheets

# 5. Run export
npm run fetch-ciidb-to-sheet

# 6. View results
# Open: https://docs.google.com/spreadsheets/d/18MJllYCK717LannQHktc1oz3EJy2aCSNbgh5LEShzQU/edit
```

That's it! 🎉
