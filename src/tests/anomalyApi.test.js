const axios = require('axios');
const { spawn } = require('child_process');
const { closeDatabase } = require('../config/database');

const API_URL = 'http://localhost:3000';
let serverProcess;

async function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['src/app.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: 3000 }
    });

    serverProcess.stdout.on('data', (data) => {
      if (data.toString().includes('server is running')) {
        setTimeout(resolve, 500);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    setTimeout(() => reject(new Error('Server failed to start')), 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
  }
}

async function testAnomalyApi() {
  console.log('Starting Anomaly API Tests...\n');

  try {
    console.log('Starting server...');
    await startServer();
    console.log('Server started successfully\n');

    console.log('Test 1: Get anomaly detection configuration');
    console.log('---------------------------------------------');
    const configResponse = await axios.get(`${API_URL}/api/anomalies/config`);
    console.log('Status:', configResponse.status);
    console.log('Config:', JSON.stringify(configResponse.data.data, null, 2));
    console.log('✓ Config endpoint works\n');

    console.log('Test 2: List excluded metrics (empty database)');
    console.log('------------------------------------------------');
    const excludedResponse = await axios.get(`${API_URL}/api/metrics/excluded`);
    console.log('Status:', excludedResponse.status);
    console.log('Excluded count:', excludedResponse.data.count);
    console.log('✓ Excluded metrics endpoint works\n');

    console.log('Test 3: Detect anomalies (dry run, no data)');
    console.log('-------------------------------------------');
    const detectResponse = await axios.post(`${API_URL}/api/anomalies/detect`, {
      dry_run: true
    });
    console.log('Status:', detectResponse.status);
    console.log('Result:', JSON.stringify(detectResponse.data.data, null, 2));
    console.log('✓ Anomaly detection endpoint works\n');

    console.log('Test 4: Get list of auto-excluded anomalies');
    console.log('--------------------------------------------');
    const autoExcludedResponse = await axios.get(`${API_URL}/api/metrics/excluded?auto_only=true`);
    console.log('Status:', autoExcludedResponse.status);
    console.log('Auto-excluded count:', autoExcludedResponse.data.count);
    console.log('✓ Auto-excluded filter works\n');

    console.log('✅ All API tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  } finally {
    console.log('\nStopping server...');
    stopServer();
    closeDatabase();
    console.log('Cleanup complete');
    process.exit(0);
  }
}

testAnomalyApi();
