const { calculateVSI } = require('./src/utils/indicators');

// Test VSI calculation with sample MA7 data
const testMa7Data = [
  { date: '2024-01-01', views_ma7: 1000 },
  { date: '2024-01-02', views_ma7: 1200 },
  { date: '2024-01-03', views_ma7: 800 },
  { date: '2024-01-04', views_ma7: 1500 },
  { date: '2024-01-05', views_ma7: 2000 },
  { date: '2024-01-06', views_ma7: 2500 },
  { date: '2024-01-07', views_ma7: 3000 },
  { date: '2024-01-08', views_ma7: 1800 },
  { date: '2024-01-09', views_ma7: 900 }
];

const vsiResult = calculateVSI(testMa7Data);
console.log('VSI Calculation Test:');
console.log(JSON.stringify(vsiResult, null, 2));