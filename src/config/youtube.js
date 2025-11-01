const { google } = require('googleapis');

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

const QUOTA_LIMIT = process.env.YOUTUBE_API_QUOTA_LIMIT || 10000;

module.exports = {
  youtube,
  QUOTA_LIMIT
};
