# Quick Setup Guide

This guide will help you get the Promo-Indicator project up and running quickly.

## Prerequisites

Before you begin, ensure you have:
- Node.js (v16 or higher) installed
- npm (v7 or higher) installed
- A YouTube Data API v3 Key

## Quick Start (5 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env` and add your YouTube API key:
```env
YOUTUBE_API_KEY=your_actual_api_key_here
```

### 3. Initialize database
```bash
npm run init-db
```

### 4. Start the server
```bash
npm run dev
```

### 5. Open the dashboard
Navigate to: `http://localhost:3000`

## Testing the API

Once the server is running, you can test the API endpoints:

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Get Video Details
```bash
curl http://localhost:3000/api/youtube/video/dQw4w9WgXcQ
```

### Search Videos
```bash
curl "http://localhost:3000/api/youtube/search?q=nodejs&maxResults=5"
```

## Project Overview

### What's Included

✅ **Backend API** (Express.js)
- YouTube Data API integration
- SQLite database with schema
- RESTful API endpoints
- Environment configuration

✅ **Frontend Dashboard** (HTML/CSS/JS)
- Video search and monitoring
- Chart.js visualizations
- Responsive design
- Real-time data display

✅ **Database Schema**
- Videos table
- Video statistics tracking
- Promo indicators
- Channel information

✅ **Configuration Files**
- `.env.example` - Environment template
- `.gitignore` - Git ignore rules
- `package.json` - Dependencies and scripts

### Project Structure

```
promo-indicator/
├── src/
│   ├── models/           # Database models
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   ├── config/           # Configuration
│   ├── scripts/          # Utility scripts
│   └── app.js            # Main app
├── frontend/
│   ├── public/           # Static files
│   └── src/              # React components (future)
├── database/             # SQLite database
└── [config files]
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with auto-reload |
| `npm run init-db` | Initialize/reset database |

## Next Steps

1. **Get a YouTube API Key**
   - Visit [Google Cloud Console](https://console.developers.google.com/)
   - Create a project and enable YouTube Data API v3
   - Generate an API key

2. **Explore the API**
   - Check `README.md` for full API documentation
   - Test endpoints using curl or Postman

3. **Customize the Dashboard**
   - Edit `frontend/public/index.html` for layout
   - Modify `frontend/public/styles.css` for styling
   - Update `frontend/public/app.js` for functionality

4. **Add Features**
   - Create new routes in `src/routes/`
   - Add services in `src/services/`
   - Extend database schema in `src/models/schema.js`

## Troubleshooting

### Port already in use
Change the `PORT` in your `.env` file to a different number.

### Database errors
Run `npm run init-db` to recreate the database.

### YouTube API errors
- Verify your API key is correct in `.env`
- Check you've enabled YouTube Data API v3
- Monitor quota usage (10,000 units/day limit)

## Support

For detailed documentation, see `README.md`.

For issues, please check the GitHub repository.
