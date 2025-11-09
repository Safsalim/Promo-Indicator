const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

class ChartGenerator {
  constructor() {
    this.width = 800;
    this.height = 400;
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: this.width, 
      height: this.height,
      backgroundColour: '#1e1e2e'
    });
  }

  async generateVsiChart(vsiHistory) {
    if (!vsiHistory || vsiHistory.length === 0) {
      throw new Error('No VSI history data provided');
    }

    const dates = vsiHistory.map(item => item.date);
    const vsiValues = vsiHistory.map(item => item.vsi);

    const configuration = {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'VSI (Viewer Sentiment Index)',
          data: vsiValues,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#8b5cf6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          title: {
            display: true,
            text: 'VSI Trend (30 Days)',
            color: '#ffffff',
            font: {
              size: 18,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: '#9ca3af',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(156, 163, 175, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#9ca3af',
              font: {
                size: 10
              },
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(156, 163, 175, 0.1)'
            }
          }
        }
      }
    };

    try {
      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
      return imageBuffer;
    } catch (error) {
      console.error('Error generating VSI chart:', error);
      throw error;
    }
  }

  async generateVsiChartWithPeakViews(vsiHistory) {
    if (!vsiHistory || vsiHistory.length === 0) {
      throw new Error('No VSI history data provided');
    }

    const dates = vsiHistory.map(item => item.date);
    const vsiValues = vsiHistory.map(item => item.vsi);
    const peakViews = vsiHistory.map(item => item.peak_views);

    const maxPeakViews = Math.max(...peakViews);
    const normalizedPeakViews = peakViews.map(views => (views / maxPeakViews) * 100);

    const configuration = {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'VSI',
            data: vsiValues,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: 'y',
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Peak Views (Normalized)',
            data: normalizedPeakViews,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            yAxisID: 'y',
            pointRadius: 2,
            pointHoverRadius: 5,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          title: {
            display: true,
            text: 'VSI & Peak Views Trend (30 Days)',
            color: '#ffffff',
            font: {
              size: 18,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: '#9ca3af',
              font: {
                size: 12
              }
            },
            grid: {
              color: 'rgba(156, 163, 175, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#9ca3af',
              font: {
                size: 10
              },
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(156, 163, 175, 0.1)'
            }
          }
        }
      }
    };

    try {
      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
      return imageBuffer;
    } catch (error) {
      console.error('Error generating VSI chart with peak views:', error);
      throw error;
    }
  }
}

module.exports = ChartGenerator;
