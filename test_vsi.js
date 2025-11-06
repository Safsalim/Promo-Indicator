const { calculateVSI, calculateVSIWithDates, getVSIClassification } = require('./src/utils/indicators');

// Test VSI calculation with known data
console.log('Testing VSI calculation...\n');

// Test case 1: Simple sequence (these are already MA7 values)
const testMA7Values = [null, null, null, null, null, null, 700, 800, 900, 1000];
console.log('Test MA7 values:', testMA7Values);
const vsiResult = calculateVSI(testMA7Values);
console.log('VSI result:', vsiResult);

// Expected: 
// - First 6 should be null (not enough data)
// - 7th value (index 6, value 700): percentile = 7/10 * 100 = 70
// - 10th value (index 9, value 1000): percentile = 10/10 * 100 = 100
// - Each value should be: (number of values <= current value) / total values * 100

console.log('\n--- Verifications ---');
console.log('First 6 values should be null:');
vsiResult.slice(0, 6).forEach((v, i) => {
  console.log(`  Index ${i}: ${v} ${v === null ? '✓' : '✗'}`);
});

console.log('7th value (700) should have VSI = 25 (1st of 4 valid values):');
console.log(`  Index 6: ${vsiResult[6]} ${vsiResult[6] === 25 ? '✓' : '✗'}`);

console.log('10th value (1000) should have VSI = 100 (4th of 4 valid values):');
console.log(`  Index 9: ${vsiResult[9]} ${vsiResult[9] === 100 ? '✓' : '✗'}`);

console.log('8th value (800) should have VSI = 50 (2nd of 4 valid values):');
console.log(`  Index 7: ${vsiResult[7]} ${vsiResult[7] === 50 ? '✓' : '✗'}`);

console.log('9th value (900) should have VSI = 75 (3rd of 4 valid values):');
console.log(`  Index 8: ${vsiResult[8]} ${vsiResult[8] === 75 ? '✓' : '✗'}`);

// Test case 2: All same values
const sameValues = [null, null, null, null, null, 500, 500, 500];
const sameVSI = calculateVSI(sameValues);
console.log('\nAll same values test:');
console.log('MA7 values:', sameValues);
console.log('VSI result:', sameVSI);
console.log('All valid VSI should be 100 (all same values):', sameVSI.slice(6).every(v => v === 100) ? '✓' : '✗');

// Test case 3: VSI classification
console.log('\n--- VSI Classification Tests ---');
const testValues = [5, 15, 45, 85, 95];
const classifications = testValues.map(v => ({
  value: v,
  classification: getVSIClassification(v)
}));

classifications.forEach(({ value, classification }) => {
  console.log(`VSI ${value}: ${classification}`);
});

// Expected:
// 5 -> Extreme Disinterest
// 15 -> Low Interest  
// 45 -> Normal
// 85 -> High Interest
// 95 -> Extreme Hype

console.log('\nAll tests completed!');