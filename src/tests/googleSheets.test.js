require('dotenv').config();
const GoogleSheetsClient = require('../config/googleSheets');

async function testGoogleSheetsSetup() {
  console.log('🧪 Testing Google Sheets Setup\n');
  
  console.log('1. Checking environment variables...');
  const hasJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const hasPath = !!process.env.GOOGLE_CREDENTIALS_PATH;
  
  if (!hasJson && !hasPath) {
    console.log('   ❌ No credentials configured');
    console.log('   ℹ️  Set either GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CREDENTIALS_PATH in .env');
    console.log('   📖 See SETUP_GOOGLE_SHEETS.md for instructions\n');
    process.exit(1);
  }
  
  if (hasJson) {
    console.log('   ✓ GOOGLE_SERVICE_ACCOUNT_JSON is set');
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      console.log(`   ✓ JSON is valid`);
      console.log(`   ✓ Project: ${parsed.project_id}`);
      console.log(`   ✓ Email: ${parsed.client_email}`);
    } catch (error) {
      console.log('   ❌ JSON is invalid:', error.message);
      process.exit(1);
    }
  }
  
  if (hasPath) {
    console.log('   ✓ GOOGLE_CREDENTIALS_PATH is set');
    const fs = require('fs');
    if (fs.existsSync(process.env.GOOGLE_CREDENTIALS_PATH)) {
      console.log('   ✓ Credentials file exists');
      try {
        const content = fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, 'utf8');
        const parsed = JSON.parse(content);
        console.log(`   ✓ JSON is valid`);
        console.log(`   ✓ Project: ${parsed.project_id}`);
        console.log(`   ✓ Email: ${parsed.client_email}`);
      } catch (error) {
        console.log('   ❌ Credentials file is invalid:', error.message);
        process.exit(1);
      }
    } else {
      console.log('   ❌ Credentials file not found');
      process.exit(1);
    }
  }
  
  console.log('\n2. Testing Google Sheets client initialization...');
  try {
    const client = new GoogleSheetsClient();
    await client.initialize();
    console.log('   ✓ Client initialized successfully');
  } catch (error) {
    console.log('   ❌ Failed to initialize:', error.message);
    process.exit(1);
  }
  
  console.log('\n3. Testing URL parsing...');
  const client = new GoogleSheetsClient();
  const testUrl = 'https://docs.google.com/spreadsheets/d/18MJllYCK717LannQHktc1oz3EJy2aCSNbgh5LEShzQU/edit?gid=857080924#gid=857080924';
  const spreadsheetId = client.extractSpreadsheetId(testUrl);
  const sheetId = client.extractSheetId(testUrl);
  console.log(`   ✓ Spreadsheet ID: ${spreadsheetId}`);
  console.log(`   ✓ Sheet ID: ${sheetId}`);
  
  console.log('\n✅ All setup tests passed!\n');
  console.log('Next steps:');
  console.log('1. Make sure the Google Sheet is shared with the service account');
  console.log('2. Set YOUTUBE_API_KEY in your .env file');
  console.log('3. Run: npm run fetch-ciidb-to-sheet\n');
}

if (require.main === module) {
  testGoogleSheetsSetup().catch(error => {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = testGoogleSheetsSetup;
