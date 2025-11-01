require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'"],
    },
  },
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Promo-Indicator API is running' });
});

const youtubeRoutes = require('./routes/youtube');
const promoRoutes = require('./routes/promo');
const youtubeApiRoutes = require('./routes/youtubeApi');
const dashboardRoutes = require('./routes/dashboard');
const marketDataRoutes = require('./routes/marketData');

app.use('/api/youtube', youtubeRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/youtube-api', youtubeApiRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', marketDataRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Promo-Indicator server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
