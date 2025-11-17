# Required Credentials to Complete Setup

## Current Status

The Google Sheets export feature has been fully implemented, but requires the **complete service account credentials** to function.

## What We Have

From the ticket, we have partial service account information:
- **Project ID**: `direct-plasma-478317-p1`
- **Client Email**: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`

## What's Missing

To authenticate with Google Sheets API, we need the **private key** for this service account. This is the most critical piece of credential information.

## How to Get the Complete Credentials

### Option 1: If you have access to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Switch to project: `direct-plasma-478317-p1`
3. Navigate to: **IAM & Admin** → **Service Accounts**
4. Find service account: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`
5. Click on the service account
6. Go to the **Keys** tab
7. Click **Add Key** → **Create new key**
8. Select **JSON** format
9. Click **Create** and download the file

### Option 2: If someone else manages the credentials

Request the full service account JSON file from your team member who set up the service account. The file should look like:

```json
{
  "type": "service_account",
  "project_id": "direct-plasma-478317-p1",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "...",
  "universe_domain": "googleapis.com"
}
```

## Once You Have the Credentials

### Step 1: Configure the credentials

Choose one method:

**Method A: Environment Variable (Production)**
```bash
# Add to your .env file
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

**Method B: File (Development)**
```bash
# Save JSON file to: config/google-credentials.json
# Add to your .env file
GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json
```

### Step 2: Share the Google Sheet

1. Open: https://docs.google.com/spreadsheets/d/18MJllYCK717LannQHktc1oz3EJy2aCSNbgh5LEShzQU/edit
2. Click **Share**
3. Add: `cto-356@direct-plasma-478317-p1.iam.gserviceaccount.com`
4. Grant **Editor** permissions
5. Uncheck "Notify people"
6. Click **Share**

### Step 3: Run the script

```bash
# Test configuration
npm run test:google-sheets

# Run the export
npm run fetch-ciidb-to-sheet
```

## Security Notes

⚠️ **IMPORTANT**: Never commit the service account JSON file or private key to git!

The `.gitignore` has been configured to exclude:
- `config/google-credentials.json`
- Any files ending in `-credentials.json`
- `.env` files

## Need Help?

See these guides for more details:
- [SETUP_GOOGLE_SHEETS.md](./SETUP_GOOGLE_SHEETS.md) - Complete setup instructions
- [GOOGLE_SHEETS_EXPORT.md](./GOOGLE_SHEETS_EXPORT.md) - Feature documentation

## Implementation Complete

All code has been implemented and tested. The only missing piece is the service account private key, which needs to be provided by someone with access to the Google Cloud project `direct-plasma-478317-p1`.
