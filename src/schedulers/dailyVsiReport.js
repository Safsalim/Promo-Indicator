const cron = require('node-cron');
const VsiCalculator = require('../services/vsiCalculator');
const ChartGenerator = require('../services/chartGenerator');
const DiscordService = require('../services/discordService');

class DailyVsiReportScheduler {
  constructor(webhookUrl, options = {}) {
    this.webhookUrl = webhookUrl;
    this.discordService = new DiscordService(webhookUrl);
    this.chartGenerator = new ChartGenerator();
    this.cronExpression = options.cronExpression || '0 8 * * *';
    this.enabled = options.enabled !== false;
    this.job = null;
  }

  async generateAndSendReport() {
    try {
      console.log('🔄 Starting daily VSI report generation...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      console.log(`📅 Generating report for date: ${yesterdayStr}`);

      const vsiTrend = VsiCalculator.getVsiTrend(yesterdayStr);
      
      if (!vsiTrend || !vsiTrend.current) {
        console.error('❌ No VSI data available for yesterday');
        await this.discordService.sendErrorNotification(
          `No VSI data available for ${yesterdayStr}. Please ensure metrics collection is running.`
        );
        return;
      }

      console.log(`📊 VSI for ${yesterdayStr}: ${vsiTrend.current.vsi} (${vsiTrend.current.vsi_label})`);
      
      if (vsiTrend.trend) {
        console.log(`📈 Trend: ${vsiTrend.trend.emoji} ${vsiTrend.trend.direction} ${vsiTrend.trend.percent_change}%`);
      }

      const vsiHistory = VsiCalculator.getVsiHistory(yesterdayStr, 30);
      
      if (vsiHistory.length === 0) {
        console.error('❌ Not enough historical data for chart generation');
        await this.discordService.sendErrorNotification(
          `Insufficient historical data for chart generation. Found 0 days of data.`
        );
        return;
      }

      console.log(`📈 Generating chart with ${vsiHistory.length} days of data...`);
      const chartBuffer = await this.chartGenerator.generateVsiChartWithPeakViews(vsiHistory);
      
      console.log('📤 Sending report to Discord...');
      await this.discordService.sendVsiReport(vsiTrend, chartBuffer);
      
      console.log('✅ Daily VSI report sent successfully');
      
      return {
        success: true,
        date: yesterdayStr,
        vsi: vsiTrend.current.vsi
      };
    } catch (error) {
      console.error('❌ Error generating/sending daily VSI report:', error);
      
      try {
        await this.discordService.sendErrorNotification(
          `Error generating daily VSI report: ${error.message}`
        );
      } catch (notificationError) {
        console.error('Failed to send error notification:', notificationError);
      }
      
      throw error;
    }
  }

  start() {
    if (!this.enabled) {
      console.log('⏸️  Daily VSI report scheduler is disabled');
      return;
    }

    if (!this.webhookUrl) {
      console.warn('⚠️  Discord webhook URL not configured. Daily VSI reports will not be sent.');
      return;
    }

    if (this.job) {
      console.log('⚠️  Daily VSI report scheduler already running');
      return;
    }

    this.job = cron.schedule(this.cronExpression, async () => {
      console.log(`⏰ Daily VSI report triggered at ${new Date().toISOString()}`);
      try {
        await this.generateAndSendReport();
      } catch (error) {
        console.error('Scheduled VSI report failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    console.log(`✅ Daily VSI report scheduler started`);
    console.log(`⏰ Schedule: ${this.cronExpression} (UTC)`);
    console.log(`📤 Webhook: ${this.webhookUrl ? '***configured***' : 'NOT CONFIGURED'}`);
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('⏹️  Daily VSI report scheduler stopped');
    }
  }

  async runNow() {
    console.log('▶️  Running daily VSI report immediately (manual trigger)...');
    return await this.generateAndSendReport();
  }
}

module.exports = DailyVsiReportScheduler;
