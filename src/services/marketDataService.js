const BtcPriceData = require('../models/BtcPriceData');
const FearGreedIndex = require('../models/FearGreedIndex');

class MarketDataService {
  static async fetchBtcPriceData(startDate, endDate) {
    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      
      const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${startTimestamp}&to=${endTimestamp}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const dailyData = this.aggregateToDailyCandles(data);
      
      return dailyData;
    } catch (error) {
      console.error('Error fetching BTC price data:', error);
      throw error;
    }
  }

  static aggregateToDailyCandles(data) {
    const dailyMap = new Map();
    
    if (data.prices && data.prices.length > 0) {
      data.prices.forEach(([timestamp, price]) => {
        const date = new Date(timestamp).toISOString().split('T')[0];
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            open: price,
            high: price,
            low: price,
            close: price,
            prices: [price],
            volumes: []
          });
        } else {
          const dayData = dailyMap.get(date);
          dayData.high = Math.max(dayData.high, price);
          dayData.low = Math.min(dayData.low, price);
          dayData.close = price;
          dayData.prices.push(price);
        }
      });
    }
    
    if (data.total_volumes && data.total_volumes.length > 0) {
      data.total_volumes.forEach(([timestamp, volume]) => {
        const date = new Date(timestamp).toISOString().split('T')[0];
        if (dailyMap.has(date)) {
          dailyMap.get(date).volumes.push(volume);
        }
      });
    }
    
    const dailyCandles = Array.from(dailyMap.values()).map(dayData => ({
      date: dayData.date,
      open: dayData.open,
      high: dayData.high,
      low: dayData.low,
      close: dayData.close,
      volume: dayData.volumes.length > 0 
        ? dayData.volumes.reduce((a, b) => a + b, 0) / dayData.volumes.length 
        : null
    }));
    
    return dailyCandles.sort((a, b) => a.date.localeCompare(b.date));
  }

  static async fetchFearGreedIndex(startDate, endDate) {
    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      
      const daysDiff = Math.ceil((endTimestamp - startTimestamp) / (24 * 60 * 60));
      const limit = Math.max(daysDiff + 10, 30);
      
      const url = `https://api.alternative.me/fng/?limit=${limit}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alternative.me API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('Invalid response format from Fear & Greed API');
      }
      
      const filteredData = result.data
        .map(item => ({
          date: this.formatFngDate(item.timestamp),
          value: parseInt(item.value, 10),
          classification: item.value_classification
        }))
        .filter(item => {
          return item.date >= startDate && item.date <= endDate;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return filteredData;
    } catch (error) {
      console.error('Error fetching Fear & Greed index:', error);
      throw error;
    }
  }

  static formatFngDate(timestamp) {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toISOString().split('T')[0];
  }

  static classifyFearGreed(value) {
    if (value <= 24) return 'Extreme Fear';
    if (value <= 49) return 'Fear';
    if (value <= 74) return 'Greed';
    return 'Extreme Greed';
  }

  static async collectBtcPriceData(startDate, endDate) {
    console.log(`\nCollecting BTC price data from ${startDate} to ${endDate}...`);
    
    const priceData = await this.fetchBtcPriceData(startDate, endDate);
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const dayData of priceData) {
      try {
        const existing = BtcPriceData.findByDate(dayData.date);
        BtcPriceData.create(dayData);
        
        if (existing) {
          updatedCount++;
          console.log(`  ✓ Updated: Date=${dayData.date}, Close=$${dayData.close.toFixed(2)}`);
        } else {
          insertedCount++;
          console.log(`  ✓ Inserted: Date=${dayData.date}, Close=$${dayData.close.toFixed(2)}`);
        }
      } catch (error) {
        console.error(`  ✗ Error storing BTC price for ${dayData.date}:`, error.message);
      }
    }
    
    console.log(`\nBTC Price Collection Summary:`);
    console.log(`  Total records processed: ${priceData.length}`);
    console.log(`  New records: ${insertedCount}`);
    console.log(`  Updated records: ${updatedCount}`);
    
    return { insertedCount, updatedCount, totalCount: priceData.length };
  }

  static async collectFearGreedData(startDate, endDate) {
    console.log(`\nCollecting Fear & Greed index data from ${startDate} to ${endDate}...`);
    
    const indexData = await this.fetchFearGreedIndex(startDate, endDate);
    
    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const dayData of indexData) {
      try {
        const existing = FearGreedIndex.findByDate(dayData.date);
        FearGreedIndex.create(dayData);
        
        if (existing) {
          updatedCount++;
          console.log(`  ✓ Updated: Date=${dayData.date}, Value=${dayData.value}, Classification=${dayData.classification}`);
        } else {
          insertedCount++;
          console.log(`  ✓ Inserted: Date=${dayData.date}, Value=${dayData.value}, Classification=${dayData.classification}`);
        }
      } catch (error) {
        console.error(`  ✗ Error storing Fear & Greed index for ${dayData.date}:`, error.message);
      }
    }
    
    console.log(`\nFear & Greed Collection Summary:`);
    console.log(`  Total records processed: ${indexData.length}`);
    console.log(`  New records: ${insertedCount}`);
    console.log(`  Updated records: ${updatedCount}`);
    
    return { insertedCount, updatedCount, totalCount: indexData.length };
  }

  static async collectAllMarketData(startDate, endDate) {
    console.log('============================================================');
    console.log('Market Data Collection');
    console.log('============================================================');
    console.log(`Date range: ${startDate} to ${endDate}`);
    console.log('============================================================');
    
    try {
      const btcResults = await this.collectBtcPriceData(startDate, endDate);
      
      const fngResults = await this.collectFearGreedData(startDate, endDate);
      
      console.log('\n============================================================');
      console.log('Overall Collection Summary');
      console.log('============================================================');
      console.log('BTC Price Data:');
      console.log(`  New: ${btcResults.insertedCount}, Updated: ${btcResults.updatedCount}, Total: ${btcResults.totalCount}`);
      console.log('Fear & Greed Index:');
      console.log(`  New: ${fngResults.insertedCount}, Updated: ${fngResults.updatedCount}, Total: ${fngResults.totalCount}`);
      console.log('============================================================');
      
      return {
        btc: btcResults,
        fearGreed: fngResults
      };
    } catch (error) {
      console.error('Error collecting market data:', error);
      throw error;
    }
  }
}

module.exports = MarketDataService;
