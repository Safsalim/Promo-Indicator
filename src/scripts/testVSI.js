const { calculateMA7AndVSI } = require('../utils/vsi');

// Test data representing 10 days of view counts
const testMetrics = [
  { id: 1, date: '2024-01-01', total_live_stream_views: 100 },
  { id: 2, date: '2024-01-02', total_live_stream_views: 150 },
  { id: 3, date: '2024-01-03', total_live_stream_views: 120 },
  { id: 4, date: '2024-01-04', total_live_stream_views: 200 },
  { id: 5, date: '2024-01-05', total_live_stream_views: 180 },
  { id: 6, date: '2024-01-06', total_live_stream_views: 80 },
  { id: 7, date: '2024-01-07', total_live_stream_views: 50 },
  { id: 8, date: '2024-01-08', total_live_stream_views: 250 },
  { id: 9, date: '2024-01-09', total_live_stream_views: 300 },
  { id: 10, date: '2024-01-10', total_live_stream_views: 220 }
];

console.log('🧪 Testing VSI Calculation...');
console.log('\n📊 Input Data:');
testMetrics.forEach(m => {
  console.log(`  ${m.date}: ${m.total_live_stream_views} views`);
});

const result = calculateMA7AndVSI(testMetrics);

console.log('\n📈 Results with MA7 and VSI:');
result.forEach((metric, index) => {
  if (metric.views_ma7 !== null) {
    console.log(`  ${metric.date}: Views=${metric.total_live_stream_views}, MA7=${metric.views_ma7}, VSI=${metric.vsi} (${metric.vsi_classification})`);
  } else {
    console.log(`  ${metric.date}: Views=${metric.total_live_stream_views}, MA7=Insufficient data, VSI=N/A`);
  }
});

console.log('\n✅ VSI Calculation Test Completed');
console.log('\n🎯 VSI Interpretation:');
console.log('   0-10:   Extreme Disinterest (Strong Buy Signal)');
console.log('   10-30:  Very Low Interest (Buy Signal)'); 
console.log('   30-70:  Normal Range (Neutral)');
console.log('   70-90:  High Interest (Sell Signal)');
console.log('   90-100: Extreme Hype (Strong Sell Signal)');