const BtcPriceData = require('../models/BtcPriceData');
const FearGreedIndex = require('../models/FearGreedIndex');

class MarketDataService {
  static async fetchBtcPriceData(startDate, endDate) {
    try {
      let startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      
      const cryptoCompareHistoricalLimit = Math.floor(new Date('2010-07-17').getTime() / 1000);
      if (startTimestamp < cryptoCompareHistoricalLimit) {
        console.warn(`⚠ CryptoCompare API only supports data from 2010-07-17 onwards`);
        console.warn(`  Adjusting start date from ${startDate} to 2010-07-17`);
        startDate = '2010-07-17';
        startTimestamp = cryptoCompareHistoricalLimit;
      }
      
      if (startTimestamp > endTimestamp) {
        console.warn(`⚠ Start date is after end date after adjustment. No data to collect.`);
        return [];
      }
      
      const daysDiff = Math.ceil((endTimestamp - startTimestamp) / (24 * 60 * 60));
      
      if (daysDiff > 2000) {
        console.log(`  📊 Large date range detected (${daysDiff} days), collecting in chunks...`);
        return await this.fetchBtcPriceDataChunked(startDate, endDate);
      }
      
      const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${daysDiff}&toTs=${endTimestamp}`;
      
      console.log(`  🔄 Fetching from CryptoCompare API: ${startDate} to ${endDate} (${daysDiff} days)`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`CryptoCompare API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Check for API-level errors
      if (result.Response === 'Error' || result.Type === 2) {
        const errorMsg = result.Message || 'Unknown API error';
        const errorDetails = result.ParamWithError ? ` (Parameter: ${result.ParamWithError})` : '';
        throw new Error(`CryptoCompare API error: ${errorMsg}${errorDetails}`);
      }
      
      // Validate response structure
      if (!result.Data || !result.Data.Data || !Array.isArray(result.Data.Data)) {
        console.error('📋 Received response structure:', JSON.stringify(result, null, 2));
        throw new Error('Invalid response format from CryptoCompare API - expected result.Data.Data to be an array');
      }
      
      console.log(`  ✓ API Response: ${result.Response || 'Success'} (Type: ${result.Type}, Data points: ${result.Data.Data.length})`);
      
      const dailyData = this.convertCryptoCompareToCandles(result.Data.Data, startDate);
      
      console.log(`  ✓ Received ${dailyData.length} days of data`);
      
      return dailyData;
    } catch (error) {
      console.error('Error fetching BTC price data:', error);
      throw error;
    }
  }

  static async fetchBtcPriceDataChunked(startDate, endDate) {
    const chunks = this.splitDateRangeByDays(startDate, endDate, 1999);
    const allData = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`  📦 Chunk ${i + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`);
      
      const endTs = Math.floor(new Date(chunk.end).getTime() / 1000);
      const daysDiff = chunk.days;
      
      const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${daysDiff}&toTs=${endTs}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`CryptoCompare API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Check for API-level errors
      if (result.Response === 'Error' || result.Type === 2) {
        const errorMsg = result.Message || 'Unknown API error';
        const errorDetails = result.ParamWithError ? ` (Parameter: ${result.ParamWithError})` : '';
        throw new Error(`CryptoCompare API error (chunk ${i + 1}/${chunks.length}): ${errorMsg}${errorDetails}`);
      }
      
      // Validate response structure
      if (!result.Data || !result.Data.Data || !Array.isArray(result.Data.Data)) {
        console.error('📋 Received response structure:', JSON.stringify(result, null, 2));
        throw new Error('Invalid response format from CryptoCompare API - expected result.Data.Data to be an array');
      }
      
      const dailyData = this.convertCryptoCompareToCandles(result.Data.Data, chunk.start);
      allData.push(...dailyData);
      
      if (i < chunks.length - 1) {
        await this.sleep(500);
      }
    }
    
    const uniqueData = this.deduplicateByDate(allData);
    console.log(`  ✓ Total collected: ${uniqueData.length} days from ${chunks.length} chunks`);
    return uniqueData;
  }

  static splitDateRangeByDays(startDate, endDate, maxDays) {
    const chunks = [];
    let currentEnd = new Date(endDate);
    const start = new Date(startDate);
    
    while (currentEnd > start) {
      const currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() - maxDays);
      
      if (currentStart < start) {
        currentStart.setTime(start.getTime());
      }
      
      const days = Math.ceil((currentEnd - currentStart) / (24 * 60 * 60 * 1000));
      
      chunks.unshift({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0],
        days: days
      });
      
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() - 1);
    }
    
    return chunks;
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static deduplicateByDate(data) {
    const uniqueMap = new Map();
    data.forEach(item => {
      if (!uniqueMap.has(item.date)) {
        uniqueMap.set(item.date, item);
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  static convertCryptoCompareToCandles(data, startDate) {
    const startTs = Math.floor(new Date(startDate).getTime() / 1000);
    
    return data
      .filter(item => item.time >= startTs)
      .map(item => {
        const date = new Date(item.time * 1000).toISOString().split('T')[0];
        
        return {
          date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volumeto || null
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  static async fetchFearGreedIndex(startDate, endDate) {
    try {
      const fngHistoricalLimit = '2018-02-01';
      
      if (endDate < fngHistoricalLimit) {
        console.warn(`⚠ Fear & Greed Index only available from ${fngHistoricalLimit} onwards`);
        console.warn(`  No data available for requested date range`);
        return [];
      }
      
      const adjustedStartDate = startDate < fngHistoricalLimit ? fngHistoricalLimit : startDate;
      
      if (adjustedStartDate !== startDate) {
        console.warn(`⚠ Fear & Greed Index only available from ${fngHistoricalLimit} onwards`);
        console.warn(`  Adjusting start date from ${startDate} to ${fngHistoricalLimit}`);
      }
      
      const now = Math.floor(Date.now() / 1000);
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      const daysSinceEnd = Math.ceil((now - endTimestamp) / (24 * 60 * 60));
      const startTimestamp = Math.floor(new Date(adjustedStartDate).getTime() / 1000);
      const totalDays = Math.ceil((endTimestamp - startTimestamp) / (24 * 60 * 60));
      
      const limit = Math.min(daysSinceEnd + totalDays + 10, 3000);
      
      const url = `https://api.alternative.me/fng/?limit=${limit}`;
      
      console.log(`  🔄 Fetching Fear & Greed Index (limit=${limit})...`);
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
          return item.date >= adjustedStartDate && item.date <= endDate;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
      
      console.log(`  ✓ Found ${filteredData.length} days in requested range`);
      
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
    
    let priceData;
    let actualStartDate = startDate;
    let actualEndDate = endDate;
    
    try {
      priceData = await this.fetchBtcPriceData(startDate, endDate);
      
      if (priceData.length === 0) {
        console.warn(`⚠ No data returned from API for the requested date range`);
        return { insertedCount: 0, updatedCount: 0, totalCount: 0, startDate, endDate };
      }
      
      actualStartDate = priceData[0].date;
      actualEndDate = priceData[priceData.length - 1].date;
      
      if (actualStartDate !== startDate || actualEndDate !== endDate) {
        console.log(`  ℹ Actual data range: ${actualStartDate} to ${actualEndDate}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to fetch data:`, error.message);
      throw error;
    }
    
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const dayData of priceData) {
      try {
        const existing = BtcPriceData.findByDate(dayData.date);
        BtcPriceData.create(dayData);
        
        if (existing) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Error storing BTC price for ${dayData.date}:`, error.message);
      }
    }
    
    console.log(`\nBTC Price Collection Summary:`);
    console.log(`  ✓ Successfully collected: ${actualStartDate} to ${actualEndDate} (${priceData.length} days)`);
    console.log(`  New records: ${insertedCount}`);
    console.log(`  Updated records: ${updatedCount}`);
    if (errorCount > 0) {
      console.log(`  ⚠ Errors: ${errorCount}`);
    }
    
    return { 
      insertedCount, 
      updatedCount, 
      totalCount: priceData.length, 
      startDate: actualStartDate, 
      endDate: actualEndDate,
      errorCount 
    };
  }

  static async collectFearGreedData(startDate, endDate) {
    console.log(`\nCollecting Fear & Greed index data from ${startDate} to ${endDate}...`);
    
    let indexData;
    let actualStartDate = startDate;
    let actualEndDate = endDate;
    
    try {
      indexData = await this.fetchFearGreedIndex(startDate, endDate);
      
      if (indexData.length === 0) {
        console.warn(`⚠ No Fear & Greed data returned from API for the requested date range`);
        return { insertedCount: 0, updatedCount: 0, totalCount: 0, startDate, endDate };
      }
      
      actualStartDate = indexData[0].date;
      actualEndDate = indexData[indexData.length - 1].date;
      
      if (actualStartDate !== startDate || actualEndDate !== endDate) {
        console.log(`  ℹ Actual data range: ${actualStartDate} to ${actualEndDate}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to fetch Fear & Greed data:`, error.message);
      throw error;
    }
    
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const dayData of indexData) {
      try {
        const existing = FearGreedIndex.findByDate(dayData.date);
        FearGreedIndex.create(dayData);
        
        if (existing) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Error storing Fear & Greed index for ${dayData.date}:`, error.message);
      }
    }
    
    console.log(`\nFear & Greed Collection Summary:`);
    console.log(`  ✓ Successfully collected: ${actualStartDate} to ${actualEndDate} (${indexData.length} days)`);
    console.log(`  New records: ${insertedCount}`);
    console.log(`  Updated records: ${updatedCount}`);
    if (errorCount > 0) {
      console.log(`  ⚠ Errors: ${errorCount}`);
    }
    
    return { 
      insertedCount, 
      updatedCount, 
      totalCount: indexData.length, 
      startDate: actualStartDate, 
      endDate: actualEndDate,
      errorCount 
    };
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
      console.log(`  Date range: ${btcResults.startDate} to ${btcResults.endDate}`);
      console.log(`  New: ${btcResults.insertedCount}, Updated: ${btcResults.updatedCount}, Total: ${btcResults.totalCount}`);
      console.log('Fear & Greed Index:');
      console.log(`  Date range: ${fngResults.startDate} to ${fngResults.endDate}`);
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
