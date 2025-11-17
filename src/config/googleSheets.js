const { google } = require('googleapis');

class GoogleSheetsClient {
  constructor() {
    this.auth = null;
    this.sheets = null;
  }

  async initialize() {
    if (this.auth && this.sheets) {
      return;
    }

    let credentials;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_CREDENTIALS_PATH) {
      const fs = require('fs');
      credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, 'utf8'));
    } else {
      throw new Error(
        'Google Sheets credentials not found. Please set either:\n' +
        '  - GOOGLE_SERVICE_ACCOUNT_JSON environment variable with full JSON credentials, or\n' +
        '  - GOOGLE_CREDENTIALS_PATH environment variable with path to credentials file'
      );
    }

    this.auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async getSheetData(spreadsheetId, range) {
    await this.initialize();
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  }

  async clearSheet(spreadsheetId, range) {
    await this.initialize();
    
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  }

  async updateSheet(spreadsheetId, range, values) {
    await this.initialize();
    
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    });

    return response.data;
  }

  async appendSheet(spreadsheetId, range, values) {
    await this.initialize();
    
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values,
      },
    });

    return response.data;
  }

  async batchUpdate(spreadsheetId, data) {
    await this.initialize();
    
    const response = await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    });

    return response.data;
  }

  extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  }

  extractSheetId(url) {
    const match = url.match(/gid=([0-9]+)/);
    return match ? match[1] : '0';
  }
}

module.exports = GoogleSheetsClient;
