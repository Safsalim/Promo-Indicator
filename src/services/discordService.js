const axios = require('axios');
const FormData = require('form-data');

class DiscordService {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendVsiReport(vsiData, chartBuffer) {
    try {
      if (!this.webhookUrl) {
        throw new Error('Discord webhook URL not configured');
      }

      const { current, previous, trend } = vsiData;
      
      let trendText = '➡️ No change';
      if (trend) {
        const sign = trend.difference >= 0 ? '+' : '';
        trendText = `${trend.emoji} VSI ${trend.direction} ${sign}${trend.difference} (${sign}${trend.percent_change}%)`;
      }

      const vsiColorMap = {
        '#16a34a': 0x16a34a,
        '#4ade80': 0x4ade80,
        '#9ca3af': 0x9ca3af,
        '#fb923c': 0xfb923c,
        '#dc2626': 0xdc2626
      };

      const embedColor = vsiColorMap[current.vsi_color] || 0x9ca3af;

      const embed = {
        title: '📊 Daily VSI Report',
        description: 'Viewer Sentiment Index (VSI) - Previous Day Summary',
        color: embedColor,
        fields: [
          {
            name: '📅 Date',
            value: current.date,
            inline: true
          },
          {
            name: '🎯 VSI',
            value: `**${current.vsi}** (${current.vsi_label})`,
            inline: true
          },
          {
            name: '👁️ Peak Views',
            value: current.peak_views.toLocaleString(),
            inline: true
          },
          {
            name: '📈 Trend',
            value: trendText,
            inline: false
          }
        ],
        footer: {
          text: `Data from ${current.channels_count} channel(s) | Sent at ${new Date().toUTCString()}`
        },
        timestamp: new Date().toISOString(),
        image: {
          url: 'attachment://vsi-chart.png'
        }
      };

      const formData = new FormData();
      
      const payload = {
        embeds: [embed]
      };
      
      formData.append('payload_json', JSON.stringify(payload));
      formData.append('file', chartBuffer, {
        filename: 'vsi-chart.png',
        contentType: 'image/png'
      });

      const response = await axios.post(this.webhookUrl, formData, {
        headers: formData.getHeaders()
      });

      console.log('✅ Discord VSI report sent successfully');
      return {
        success: true,
        response: response.data
      };
    } catch (error) {
      console.error('❌ Error sending Discord VSI report:', error.message);
      if (error.response) {
        console.error('Discord API Error:', error.response.data);
      }
      throw error;
    }
  }

  async sendErrorNotification(errorMessage) {
    try {
      if (!this.webhookUrl) {
        console.error('Discord webhook URL not configured, cannot send error notification');
        return;
      }

      const embed = {
        title: '⚠️ VSI Report Error',
        description: 'An error occurred while generating the daily VSI report',
        color: 0xff0000,
        fields: [
          {
            name: 'Error',
            value: `\`\`\`${errorMessage}\`\`\``,
            inline: false
          },
          {
            name: 'Time',
            value: new Date().toUTCString(),
            inline: false
          }
        ],
        timestamp: new Date().toISOString()
      };

      await axios.post(this.webhookUrl, {
        embeds: [embed]
      });

      console.log('Error notification sent to Discord');
    } catch (error) {
      console.error('Failed to send error notification to Discord:', error.message);
    }
  }

  async testConnection() {
    try {
      if (!this.webhookUrl) {
        throw new Error('Discord webhook URL not configured');
      }

      const embed = {
        title: '✅ Discord Connection Test',
        description: 'This is a test message to verify the Discord webhook connection.',
        color: 0x00ff00,
        timestamp: new Date().toISOString()
      };

      await axios.post(this.webhookUrl, {
        embeds: [embed]
      });

      console.log('✅ Discord connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Discord connection test failed:', error.message);
      throw error;
    }
  }
}

module.exports = DiscordService;
