require('dotenv').config();
const { YouTubeApiClient, YouTubeApiError } = require('../services/youtubeApiClient');

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async test(name, fn) {
    try {
      await fn();
      this.passed++;
      console.log(`✓ ${name}`);
      this.tests.push({ name, status: 'PASS' });
    } catch (error) {
      this.failed++;
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      this.tests.push({ name, status: 'FAIL', error: error.message });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || 'Value is null or undefined');
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('Test Summary');
    console.log('='.repeat(70));
    console.log(`Total: ${this.passed + this.failed}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log('='.repeat(70));
    
    if (this.failed > 0) {
      console.log('\nFailed Tests:');
      this.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`  - ${t.name}`);
        console.log(`    ${t.error}`);
      });
    }
  }
}

async function runTests() {
  const runner = new TestRunner();
  const client = new YouTubeApiClient();

  console.log('='.repeat(70));
  console.log('YouTube API Client - Unit Tests');
  console.log('='.repeat(70));
  console.log();

  await runner.test('Client initialization', async () => {
    runner.assertNotNull(client, 'Client should be initialized');
    runner.assertEqual(client.quotaUsed, 0, 'Initial quota should be 0');
  });

  await runner.test('Quota tracking', async () => {
    client.resetQuota();
    client.checkQuota(100);
    runner.assertEqual(client.quotaUsed, 100, 'Quota should be tracked');
    
    client.checkQuota(50);
    runner.assertEqual(client.quotaUsed, 150, 'Quota should accumulate');
  });

  await runner.test('Quota limit enforcement', async () => {
    client.resetQuota();
    
    try {
      client.checkQuota(15000);
      throw new Error('Should have thrown quota exceeded error');
    } catch (error) {
      runner.assert(error instanceof YouTubeApiError, 'Should throw YouTubeApiError');
      runner.assertEqual(error.type, 'QUOTA_EXCEEDED', 'Should be QUOTA_EXCEEDED error');
    }
  });

  await runner.test('API key validation', async () => {
    const originalKey = process.env.YOUTUBE_API_KEY;
    process.env.YOUTUBE_API_KEY = '';
    
    try {
      client.validateApiKey();
      throw new Error('Should have thrown auth error');
    } catch (error) {
      runner.assert(error instanceof YouTubeApiError, 'Should throw YouTubeApiError');
      runner.assertEqual(error.type, 'AUTH_ERROR', 'Should be AUTH_ERROR');
    } finally {
      process.env.YOUTUBE_API_KEY = originalKey;
    }
  });

  await runner.test('Error categorization - quota exceeded', async () => {
    const error = {
      response: {
        status: 403,
        data: {
          error: {
            errors: [{ reason: 'quotaExceeded' }]
          }
        }
      }
    };
    
    const type = client.categorizeError(error);
    runner.assertEqual(type, 'QUOTA_EXCEEDED', 'Should categorize as QUOTA_EXCEEDED');
  });

  await runner.test('Error categorization - auth error', async () => {
    const error = {
      response: {
        status: 401,
        data: {}
      }
    };
    
    const type = client.categorizeError(error);
    runner.assertEqual(type, 'AUTH_ERROR', 'Should categorize as AUTH_ERROR');
  });

  await runner.test('Error categorization - not found', async () => {
    const error = {
      response: {
        status: 404,
        data: {}
      }
    };
    
    const type = client.categorizeError(error);
    runner.assertEqual(type, 'NOT_FOUND', 'Should categorize as NOT_FOUND');
  });

  await runner.test('Error categorization - network error', async () => {
    const error = { message: 'Network error' };
    
    const type = client.categorizeError(error);
    runner.assertEqual(type, 'NETWORK_ERROR', 'Should categorize as NETWORK_ERROR');
  });

  await runner.test('Quota usage reporting', async () => {
    client.resetQuota();
    client.checkQuota(500);
    
    const usage = client.getQuotaUsage();
    runner.assertEqual(usage.used, 500, 'Should report correct usage');
    runner.assert(usage.remaining >= 0, 'Should report remaining quota');
    runner.assertNotNull(usage.percentage, 'Should report percentage');
  });

  if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== 'your_youtube_api_key_here') {
    console.log('\n--- Integration Tests (using real API) ---\n');

    await runner.test('Resolve channel handle - valid channel', async () => {
      try {
        const result = await client.resolveChannelHandle('@YouTube');
        runner.assertNotNull(result.channelId, 'Should return channel ID');
        runner.assertNotNull(result.channelTitle, 'Should return channel title');
      } catch (error) {
        if (error.type === 'QUOTA_EXCEEDED') {
          console.log('  (Skipped due to quota limit)');
          runner.passed++;
        } else {
          throw error;
        }
      }
    });

    await runner.test('Resolve channel handle - invalid channel', async () => {
      try {
        await client.resolveChannelHandle('@this_channel_definitely_does_not_exist_12345_xyz');
        throw new Error('Should have thrown NOT_FOUND error');
      } catch (error) {
        if (error.type === 'QUOTA_EXCEEDED') {
          console.log('  (Skipped due to quota limit)');
          runner.passed++;
        } else {
          runner.assert(error instanceof YouTubeApiError, 'Should throw YouTubeApiError');
          runner.assertEqual(error.type, 'NOT_FOUND', 'Should be NOT_FOUND error');
        }
      }
    });

    await runner.test('Get video statistics - empty array', async () => {
      try {
        const result = await client.getVideoStatistics([]);
        runner.assert(Array.isArray(result), 'Should return array');
        runner.assertEqual(result.length, 0, 'Should return empty array');
      } catch (error) {
        if (error.type === 'QUOTA_EXCEEDED') {
          console.log('  (Skipped due to quota limit)');
          runner.passed++;
        } else {
          throw error;
        }
      }
    });
  } else {
    console.log('\n--- Integration Tests Skipped ---');
    console.log('Set YOUTUBE_API_KEY in .env to run integration tests\n');
  }

  runner.printSummary();
  
  return runner.failed === 0;
}

if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };
