# Google Sheets Setup Instructions

## Quick Start

To run the @ciidb livestream export, you need to complete the following steps:

### Step 1: Get the Complete Service Account Private Key

The ticket mentions these service account details:
- **Project ID**: `direct-plasma-478317-p1`
- **Client Email**: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`

However, the **private key** is needed to authenticate. Request the full service account JSON credentials from your team or:

1. Access the Google Cloud Console for project `direct-plasma-478317-p1`
2. Go to **IAM & Admin** > **Service Accounts**
3. Find the service account: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`
4. Create a new key (or retrieve the existing key)
5. Download as JSON

### Step 2: Configure Credentials

Choose one of these methods:

#### Method A: Environment Variable (Recommended for Production)

1. Copy the entire contents of your downloaded JSON file
2. Add to your `.env` file as a single line:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"direct-plasma-478317-p1",...}'
   ```

#### Method B: Credentials File (Recommended for Development)

1. Copy your downloaded JSON file to: `config/google-credentials.json`
2. Add to your `.env` file:
   ```bash
   GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json
   ```

### Step 3: Share Google Sheet with Service Account

1. Open the target sheet: https://docs.google.com/spreadsheets/d/18MJllYCK717LannQHktc1oz3EJy2aCSNbgh5LEShzQU/edit
2. Click the **Share** button (top right)
3. Add this email: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`
4. Set permissions to **Editor**
5. Uncheck "Notify people" (it's a service account)
6. Click **Share**

### Step 4: Configure YouTube API Key

Add your YouTube API key to `.env`:
```bash
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### Step 5: Run the Script

```bash
npm run fetch-ciidb-to-sheet
```

## Verification

To verify everything is set up correctly:

1. The script should resolve the @ciidb channel
2. Fetch livestreams since 2024-11-09
3. Update the Google Sheet without errors

If you see "The caller does not have permission", make sure the service account email has been added to the Google Sheet with Editor permissions.

## Expected Output

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

✍️  Writing data to Google Sheet...
✅ Successfully wrote X livestreams to the sheet

🎉 Task completed successfully!
```

## Troubleshooting

### Error: "Google Sheets credentials not found"
- Make sure you've set either `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_CREDENTIALS_PATH` in `.env`
- Verify the JSON is valid (use a JSON validator)

### Error: "The caller does not have permission"
- Add the service account email to the Google Sheet with Editor permissions
- Make sure the Google Sheets API is enabled in the Google Cloud project

### Error: "YouTube API key is missing"
- Set `YOUTUBE_API_KEY` in your `.env` file

### Error: "Channel not found"
- Verify the YouTube API key is valid and has quota remaining

## Files Created

This implementation includes:

1. **`/src/config/googleSheets.js`** - Google Sheets API client wrapper
2. **`/src/scripts/fetchCiidbToSheet.js`** - Main export script
3. **`/config/google-credentials.template.json`** - Template for credentials
4. **`GOOGLE_SHEETS_EXPORT.md`** - Detailed feature documentation
5. **`SETUP_GOOGLE_SHEETS.md`** - This setup guide

## Security Notes

- Never commit actual credentials to git
- The `.gitignore` file has been updated to exclude credential files
- Use environment variables in production environments
- Rotate service account keys periodically
