/**
 * Dashboard API Integration Tests
 * 
 * Tests API endpoints via HTTP requests to a running server.
 * Run these tests with the server running on port 3000.
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test suite
async function runTests() {
  console.log('=== Dashboard API Integration Tests ===\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: GET /api/health
  console.log('Test 1: GET /api/health');
  try {
    const result = await makeRequest('GET', '/api/health');
    if (result.status === 200 && result.data.status === 'ok') {
      console.log('✓ Health check passed');
      testsPassed++;
    } else {
      console.error('✗ Unexpected response:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 2: GET /api/channels
  console.log('\nTest 2: GET /api/channels');
  try {
    const result = await makeRequest('GET', '/api/channels');
    if (result.status === 200 && result.data.success === true) {
      console.log('✓ Channels retrieved:', result.data.count);
      console.log('  Sample:', result.data.data[0]?.channel_handle || 'No channels');
      testsPassed++;
    } else {
      console.error('✗ Unexpected response:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 3: POST /api/channels - missing field
  console.log('\nTest 3: POST /api/channels - validation error');
  try {
    const result = await makeRequest('POST', '/api/channels', {});
    if (result.status === 400 && result.data.success === false) {
      console.log('✓ Validation error caught:', result.data.error);
      testsPassed++;
    } else {
      console.error('✗ Should return 400 error:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 4: POST /api/channels - duplicate channel
  console.log('\nTest 4: POST /api/channels - duplicate channel');
  try {
    const result = await makeRequest('POST', '/api/channels', {
      channel_handle: '@testchannel'
    });
    if (result.status === 409 && result.data.success === false) {
      console.log('✓ Duplicate error caught:', result.data.error);
      testsPassed++;
    } else {
      console.error('✗ Should return 409 error:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 5: GET /api/metrics
  console.log('\nTest 5: GET /api/metrics');
  try {
    const result = await makeRequest('GET', '/api/metrics');
    if (result.status === 200 && result.data.success === true) {
      console.log('✓ Metrics retrieved:', result.data.count);
      testsPassed++;
    } else {
      console.error('✗ Unexpected response:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 6: GET /api/metrics - with filters
  console.log('\nTest 6: GET /api/metrics?channel_ids=1&start_date=2024-01-16&end_date=2024-01-18');
  try {
    const result = await makeRequest('GET', '/api/metrics?channel_ids=1&start_date=2024-01-16&end_date=2024-01-18');
    if (result.status === 200 && result.data.success === true) {
      console.log('✓ Filtered metrics retrieved:', result.data.count);
      console.log('  Filters applied:', JSON.stringify(result.data.filters));
      testsPassed++;
    } else {
      console.error('✗ Unexpected response:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 7: GET /api/metrics - invalid date
  console.log('\nTest 7: GET /api/metrics?start_date=invalid');
  try {
    const result = await makeRequest('GET', '/api/metrics?start_date=invalid');
    if (result.status === 400 && result.data.success === false) {
      console.log('✓ Date validation error caught:', result.data.error);
      testsPassed++;
    } else {
      console.error('✗ Should return 400 error:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 8: GET /api/metrics - invalid channel_ids
  console.log('\nTest 8: GET /api/metrics?channel_ids=abc');
  try {
    const result = await makeRequest('GET', '/api/metrics?channel_ids=abc');
    if (result.status === 400 && result.data.success === false) {
      console.log('✓ Channel ID validation error caught:', result.data.error);
      testsPassed++;
    } else {
      console.error('✗ Should return 400 error:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 9: GET /api/metrics - with limit
  console.log('\nTest 9: GET /api/metrics?limit=2');
  try {
    const result = await makeRequest('GET', '/api/metrics?limit=2');
    if (result.status === 200 && result.data.success === true && result.data.count <= 2) {
      console.log('✓ Limit applied correctly, returned:', result.data.count);
      testsPassed++;
    } else {
      console.error('✗ Limit not applied correctly:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 10: GET /api/metrics/summary
  console.log('\nTest 10: GET /api/metrics/summary');
  try {
    const result = await makeRequest('GET', '/api/metrics/summary');
    if (result.status === 200 && result.data.success === true) {
      console.log('✓ Summary retrieved');
      console.log('  Total views:', result.data.data.summary.total_views);
      console.log('  Total channels:', result.data.data.summary.total_channels);
      testsPassed++;
    } else {
      console.error('✗ Unexpected response:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 11: GET /api/metrics/summary - with date range (should include trend)
  console.log('\nTest 11: GET /api/metrics/summary?start_date=2024-01-15&end_date=2024-01-19');
  try {
    const result = await makeRequest('GET', '/api/metrics/summary?start_date=2024-01-15&end_date=2024-01-19');
    if (result.status === 200 && result.data.success === true && result.data.data.trend) {
      console.log('✓ Summary with trend retrieved');
      console.log('  Trend direction:', result.data.data.trend.direction);
      console.log('  Trend percentage:', result.data.data.trend.percentage + '%');
      testsPassed++;
    } else {
      console.error('✗ Unexpected response (should include trend):', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 12: GET /api/metrics/summary - with channel_ids (should include breakdown)
  console.log('\nTest 12: GET /api/metrics/summary?channel_ids=1,2');
  try {
    const result = await makeRequest('GET', '/api/metrics/summary?channel_ids=1,2');
    if (result.status === 200 && result.data.success === true && result.data.data.channel_breakdown) {
      console.log('✓ Summary with channel breakdown retrieved');
      console.log('  Number of channels:', result.data.data.channel_breakdown.length);
      testsPassed++;
    } else {
      console.error('✗ Unexpected response (should include channel_breakdown):', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Test 13: GET /api/metrics/summary - complete (trend + breakdown)
  console.log('\nTest 13: GET /api/metrics/summary - complete with all filters');
  try {
    const result = await makeRequest('GET', '/api/metrics/summary?channel_ids=1,2&start_date=2024-01-15&end_date=2024-01-19');
    if (result.status === 200 && result.data.success === true && 
        result.data.data.trend && result.data.data.channel_breakdown) {
      console.log('✓ Complete summary retrieved');
      console.log('  Has summary:', !!result.data.data.summary);
      console.log('  Has trend:', !!result.data.data.trend);
      console.log('  Has breakdown:', !!result.data.data.channel_breakdown);
      testsPassed++;
    } else {
      console.error('✗ Should include both trend and breakdown:', result);
      testsFailed++;
    }
  } catch (error) {
    console.error('✗ Error:', error.message);
    testsFailed++;
  }

  // Results
  console.log('\n=== Test Results ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total:  ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
