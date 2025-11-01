const express = require('express');
const router = express.Router();
const BtcPriceData = require('../models/BtcPriceData');
const FearGreedIndex = require('../models/FearGreedIndex');
const MarketDataService = require('../services/marketDataService');

router.get('/btc-price', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let data;
    if (start_date && end_date) {
      data = BtcPriceData.findByDateRange(start_date, end_date);
    } else {
      data = BtcPriceData.findAll();
    }
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching BTC price data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch BTC price data'
    });
  }
});

router.get('/fear-greed', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let data;
    if (start_date && end_date) {
      data = FearGreedIndex.findByDateRange(start_date, end_date);
    } else {
      data = FearGreedIndex.findAll();
    }
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    console.error('Error fetching Fear & Greed index:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Fear & Greed index'
    });
  }
});

router.post('/collect-market-data', async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }
    
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'start_date must be before or equal to end_date'
      });
    }
    
    const results = await MarketDataService.collectAllMarketData(start_date, end_date);
    
    res.json({
      success: true,
      message: 'Market data collection completed',
      results
    });
  } catch (error) {
    console.error('Error collecting market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect market data',
      details: error.message
    });
  }
});

router.get('/market-summary', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let btcData, fngData;
    
    if (start_date && end_date) {
      btcData = BtcPriceData.findByDateRange(start_date, end_date);
      fngData = FearGreedIndex.findByDateRange(start_date, end_date);
    } else {
      btcData = BtcPriceData.findAll();
      fngData = FearGreedIndex.findAll();
    }
    
    let btcSummary = null;
    if (btcData.length > 0) {
      const closes = btcData.map(d => d.close).filter(c => c !== null);
      const volumes = btcData.map(d => d.volume).filter(v => v !== null);
      
      btcSummary = {
        count: btcData.length,
        firstDate: btcData[0].date,
        lastDate: btcData[btcData.length - 1].date,
        firstPrice: btcData[0].close,
        lastPrice: btcData[btcData.length - 1].close,
        highestPrice: Math.max(...btcData.map(d => d.high).filter(h => h !== null)),
        lowestPrice: Math.min(...btcData.map(d => d.low).filter(l => l !== null)),
        avgPrice: closes.length > 0 ? closes.reduce((a, b) => a + b, 0) / closes.length : null,
        avgVolume: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null,
        priceChange: btcData[btcData.length - 1].close - btcData[0].close,
        priceChangePercent: ((btcData[btcData.length - 1].close - btcData[0].close) / btcData[0].close) * 100
      };
    }
    
    let fngSummary = null;
    if (fngData.length > 0) {
      const values = fngData.map(d => d.value).filter(v => v !== null);
      
      const classifications = fngData.reduce((acc, d) => {
        acc[d.classification] = (acc[d.classification] || 0) + 1;
        return acc;
      }, {});
      
      fngSummary = {
        count: fngData.length,
        firstDate: fngData[0].date,
        lastDate: fngData[fngData.length - 1].date,
        firstValue: fngData[0].value,
        lastValue: fngData[fngData.length - 1].value,
        avgValue: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null,
        minValue: Math.min(...values),
        maxValue: Math.max(...values),
        classifications
      };
    }
    
    res.json({
      success: true,
      data: {
        btc: btcSummary,
        fearGreed: fngSummary
      }
    });
  } catch (error) {
    console.error('Error fetching market summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market summary'
    });
  }
});

module.exports = router;
