require('dotenv').config();
const DailyVsiReportScheduler = require('../schedulers/dailyVsiReport');

async function testVsiReport() {
  try {
    console.log('🧪 Testing VSI Report Generation\n');
    console.log('=' .repeat(50));
    
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('❌ DISCORD_WEBHOOK_URL not set in environment variables');
      process.exit(1);
    }
    
    console.log('✅ Discord webhook URL configured');
    console.log(`📤 Webhook: ${webhookUrl.substring(0, 50)}...`);
    console.log('');
    
    const scheduler = new DailyVsiReportScheduler(webhookUrl, {
      enabled: false
    });
    
    console.log('🔄 Generating and sending VSI report...\n');
    
    const result = await scheduler.runNow();
    
    if (result && result.success) {
      console.log('');
      console.log('=' .repeat(50));
      console.log('✅ Test completed successfully!');
      console.log('📊 Report Details:');
      console.log(`   - Date: ${result.date}`);
      console.log(`   - VSI: ${result.vsi}`);
      console.log('');
      console.log('Check your Discord channel for the message!');
      process.exit(0);
    } else {
      console.log('');
      console.log('=' .repeat(50));
      console.log('⚠️  Report generation had issues (check logs above)');
      console.log('An error notification may have been sent to Discord.');
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('=' .repeat(50));
    console.error('❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

testVsiReport();
