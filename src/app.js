require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend/public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Promo-Indicator API is running' });
});

const youtubeRoutes = require('./routes/youtube');
const promoRoutes = require('./routes/promo');
const youtubeApiRoutes = require('./routes/youtubeApi');

app.use('/api/youtube', youtubeRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/youtube-api', youtubeApiRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Promo-Indicator server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
