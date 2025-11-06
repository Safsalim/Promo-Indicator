#!/usr/bin/env node

const LiveStreamMetrics = require('../models/LiveStreamMetrics');

async function calculateVSIForAllData() {
  console.log('🚀 Starting VSI calculation for all existing data...');
  
  try {
    const result = await LiveStreamMetrics.calculateAndUpdateVSIForAllChannels();
    
    console.log(`✅ VSI calculation completed!`);
    console.log(`📊 Updated ${result.updated} records across ${result.channels} channels`);
    console.log('');
    console.log('🎯 VSI Scores Interpretation:');
    console.log('   0-10:   Extreme Disinterest (Strong Buy Signal)');
    console.log('   10-30:  Very Low Interest (Buy Signal)'); 
    console.log('   30-70:  Normal Range (Neutral)');
    console.log('   70-90:  High Interest (Sell Signal)');
    console.log('   90-100: Extreme Hype (Strong Sell Signal)');
    console.log('');
    console.log('📈 VSI chart is now available in the dashboard!');
    
  } catch (error) {
    console.error('❌ Error calculating VSI:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  calculateVSIForAllData();
}

module.exports = { calculateVSIForAllData };