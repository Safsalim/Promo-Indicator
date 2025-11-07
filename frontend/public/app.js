const API_BASE_URL = 'http://localhost:3000/api';

let viewsChart = null;
let rsiChart = null;
let btcChart = null;
let fngChart = null;
let vsiChart = null;
let overlayChart = null;
let allChannels = [];
let currentMetrics = [];
let currentRsiData = {};
let currentRsiPeriod = 14;
let currentBtcData = [];
let currentFngData = [];
let currentVsiData = {};
let currentViewMode = 'stacked';

const CHART_COLORS = [
  '#667eea',
  '#764ba2',
  '#f093fb',
  '#4facfe',
  '#43e97b',
  '#fa709a',
  '#fee140',
  '#30cfd0',
  '#a8edea',
  '#ff6b6b'
];

function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function showFeedback(elementId, message, type) {
  const feedbackEl = document.getElementById(elementId);
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback-message ${type}`;
  feedbackEl.style.display = 'block';
  
  setTimeout(() => {
    feedbackEl.style.display = 'none';
  }, 5000);
}

function showLoading(show) {
  const loadingEl = document.getElementById('chartLoading');
  loadingEl.style.display = show ? 'flex' : 'none';
}

async function fetchChannels() {
  try {
    const response = await fetch(`${API_BASE_URL}/channels`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch channels');
    }
    
    const result = await response.json();
    allChannels = result.data || [];
    
    populateChannelSelector();
  } catch (error) {
    console.error('Error fetching channels:', error);
    showFeedback('addChannelFeedback', 'Failed to load channels', 'error');
  }
}

function populateChannelSelector() {
  const selector = document.getElementById('channelSelector');
  
  if (allChannels.length === 0) {
    selector.innerHTML = '<option value="">No channels available. Add one above!</option>';
    return;
  }
  
  selector.innerHTML = allChannels
    .filter(channel => channel.is_active)
    .map(channel => {
      const displayName = channel.channel_name 
        ? `${channel.channel_handle} - ${channel.channel_name}`
        : channel.channel_handle;
      return `<option value="${channel.id}">${displayName}</option>`;
    })
    .join('');
  
  const firstChannelId = allChannels.find(c => c.is_active)?.id;
  if (firstChannelId) {
    selector.querySelector(`option[value="${firstChannelId}"]`).selected = true;
  }
}

async function addChannel() {
  const input = document.getElementById('channelHandleInput');
  const btn = document.getElementById('addChannelBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  
  const handle = input.value.trim();
  
  if (!handle) {
    showFeedback('addChannelFeedback', 'Please enter a channel handle', 'error');
    return;
  }
  
  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  
  try {
    const response = await fetch(`${API_BASE_URL}/channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        channel_handle: handle.startsWith('@') ? handle : `@${handle}` 
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to add channel');
    }
    
    showFeedback('addChannelFeedback', 
      `Successfully added ${result.data.channel_name || result.data.channel_handle}!`, 
      'success');
    
    input.value = '';
    await fetchChannels();
    
  } catch (error) {
    console.error('Error adding channel:', error);
    showFeedback('addChannelFeedback', error.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

function initializeDateRange(days = 90) {
  const endDate = getTodayDate();
  let startDate;
  
  if (days === 'all') {
    startDate = '2020-01-01';
  } else {
    startDate = getDateDaysAgo(days);
  }
  
  document.getElementById('startDate').value = startDate;
  document.getElementById('endDate').value = endDate;
}

function setupDatePresets() {
  const presetBtns = document.querySelectorAll('.preset-btn');
  
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const days = btn.dataset.days;
      initializeDateRange(days === 'all' ? 'all' : parseInt(days));
    });
  });
}

function getSelectedChannelIds() {
  const selector = document.getElementById('channelSelector');
  const selected = Array.from(selector.selectedOptions).map(opt => opt.value);
  return selected.filter(id => id !== '');
}

async function fetchMetrics() {
  const channelIds = getSelectedChannelIds();
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  if (channelIds.length === 0) {
    showFeedback('addChannelFeedback', 'Please select at least one channel', 'error');
    return;
  }
  
  if (!startDate || !endDate) {
    showFeedback('addChannelFeedback', 'Please select a date range', 'error');
    return;
  }
  
  showLoading(true);
  document.getElementById('noDataMessage').style.display = 'none';
  
  try {
    const showExcluded = document.getElementById('showExcludedToggle').checked;
    const params = new URLSearchParams({
      channel_ids: channelIds.join(','),
      start_date: startDate,
      end_date: endDate,
      rsi_period: currentRsiPeriod,
      include_excluded: showExcluded
    });
    
    const marketParams = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    });

    const [metricsResponse, summaryResponse, btcResponse, fngResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/metrics?${params}`),
      fetch(`${API_BASE_URL}/metrics/summary?${params}`),
      fetch(`${API_BASE_URL}/btc-price?${marketParams}`),
      fetch(`${API_BASE_URL}/fear-greed?${marketParams}`)
    ]);
    
    if (!metricsResponse.ok || !summaryResponse.ok) {
      throw new Error('Failed to fetch metrics data');
    }
    
    const metricsResult = await metricsResponse.json();
    const summaryResult = await summaryResponse.json();
    const btcResult = btcResponse.ok ? await btcResponse.json() : { data: [] };
    const fngResult = fngResponse.ok ? await fngResponse.json() : { data: [] };
    
    currentMetrics = metricsResult.data || [];
    currentRsiData = metricsResult.rsi || {};
    currentVsiData = metricsResult.vsi || {};
    currentBtcData = btcResult.data || [];
    currentFngData = fngResult.data || [];
    
    if (currentMetrics.length === 0) {
      showNoData();
    } else {
      updateChart(currentMetrics);
      updateRsiChart(currentRsiData, channelIds);
      updateBtcChart(currentBtcData);
      updateFngChart(currentFngData);
      updateVsiChart(currentVsiData, channelIds);
      updateSummaryStats(summaryResult.data, currentMetrics);
      document.getElementById('noDataMessage').style.display = 'none';
    }
    
    // Fetch excluded days after metrics are loaded
    await fetchExcludedDays();
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    showFeedback('addChannelFeedback', 'Failed to load metrics data', 'error');
    showNoData();
  } finally {
    showLoading(false);
  }
}

function showNoData() {
  document.getElementById('noDataMessage').style.display = 'block';
  
  if (viewsChart) {
    viewsChart.destroy();
    viewsChart = null;
  }
  
  if (rsiChart) {
    rsiChart.destroy();
    rsiChart = null;
  }

  if (btcChart) {
    btcChart.destroy();
    btcChart = null;
  }

  if (fngChart) {
    fngChart.destroy();
    fngChart = null;
  }

  if (vsiChart) {
    vsiChart.destroy();
    vsiChart = null;
  }
  
  resetSummaryStats();
}

function updateChart(metrics) {
   const groupedByChannel = {};
   const ma7Grouped = {};

   metrics.forEach(metric => {
     const channelId = metric.channel_id;
     if (!groupedByChannel[channelId]) {
       groupedByChannel[channelId] = {
         label: metric.channel_name || metric.channel_handle,
         data: []
       };
       ma7Grouped[channelId] = {
         label: (metric.channel_name || metric.channel_handle) + ' - 7d MA',
         data: []
       };
     }
     groupedByChannel[channelId].data.push({
       date: metric.date,
       views: metric.total_live_stream_views
     });
     ma7Grouped[channelId].data.push({
       date: metric.date,
       views_ma7: metric.views_ma7
     });
   });

   const allDates = [...new Set(metrics.map(m => m.date))].sort();

   const datasets = Object.keys(groupedByChannel).map((channelId, index) => {
     const channelData = groupedByChannel[channelId];
     const color = CHART_COLORS[index % CHART_COLORS.length];

     const dateMap = {};
     channelData.data.forEach(item => {
       dateMap[item.date] = item.views;
     });

     const chartData = allDates.map(date => dateMap[date] || 0);

     return {
       label: channelData.label,
       data: chartData,
       borderColor: color,
       backgroundColor: color + '33',
       borderWidth: 2,
       fill: false,
       tension: 0.4,
       pointRadius: 4,
       pointHoverRadius: 6,
       pointBackgroundColor: color,
       pointBorderColor: '#fff',
       pointBorderWidth: 2
     };
   });

   const ma7Toggle = document.getElementById('ma7Toggle');
   if (ma7Toggle && ma7Toggle.checked) {
     Object.keys(ma7Grouped).forEach((channelId, index) => {
       const ma7Data = ma7Grouped[channelId];
       const color = CHART_COLORS[index % CHART_COLORS.length];

       const dateMap = {};
       ma7Data.data.forEach(item => {
         dateMap[item.date] = item.views_ma7;
       });

       const chartData = allDates.map(date => dateMap[date] || null);

       datasets.push({
         label: ma7Data.label,
         data: chartData,
         borderColor: color,
         backgroundColor: 'transparent',
         borderWidth: 2,
         borderDash: [5, 5],
         fill: false,
         tension: 0.4,
         pointRadius: 0,
         pointHoverRadius: 4,
         pointBackgroundColor: color,
         pointBorderColor: '#fff',
         pointBorderWidth: 2,
         spanGaps: true
       });
     });
   }
  
  const labels = allDates.map(date => formatDate(date));
  
  if (viewsChart) {
    viewsChart.destroy();
  }
  
  const ctx = document.getElementById('viewsChart').getContext('2d');
  viewsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          bodySpacing: 6,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += formatNumber(context.parsed.y) + ' peak views';
              
              // Find the metric data to check stream count and get ID
              const dateIndex = context.dataIndex;
              const channelLabel = context.dataset.label;
              const metric = currentMetrics.find(m => 
                (m.channel_name || m.channel_handle) === channelLabel && 
                allDates[dateIndex] === m.date
              );
              
              const result = [label];
              
              if (metric && metric.live_stream_count > 1) {
                result.push(`(${metric.live_stream_count} streams on this day)`);
              }
              
              // Add exclude button if not excluded and metric exists
              if (metric && !metric.is_excluded && !context.dataset.label.includes('7d MA')) {
                result.push('');
                result.push('Click to exclude this data point');
              }
              
              return result;
            },
            title: function(context) {
              const dateIndex = context[0].dataIndex;
              const date = allDates[dateIndex];
              const channelLabel = context[0].dataset.label;
              const metric = currentMetrics.find(m => 
                (m.channel_name || m.channel_handle) === channelLabel && 
                date === m.date
              );
              
              if (metric && metric.is_excluded) {
                return formatDate(date) + ' (EXCLUDED)';
              }
              return formatDate(date);
            }
          },
          external: function(context) {
            // Tooltip Element
            let tooltipEl = document.getElementById('chartjs-tooltip');

            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'chartjs-tooltip';
              tooltipEl.innerHTML = '<table></table>';
              document.body.appendChild(tooltipEl);
            }

            // Hide if no tooltip
            const tooltipModel = context.tooltip;
            if (tooltipModel.opacity === 0) {
              tooltipEl.style.opacity = 0;
              return;
            }

            // Set Text
            if (tooltipModel.body) {
              const titleLines = tooltipModel.title || [];
              const bodyLines = tooltipModel.body.map(b => b.lines);

              let innerHtml = '<thead>';

              titleLines.forEach(function(title) {
                innerHtml += '<tr><th>' + title + '</th></tr>';
              });
              innerHtml += '</thead><tbody>';

              bodyLines.forEach(function(body, i) {
                const colors = tooltipModel.labelColors[i];
                const span = '<span style="background:' + colors.backgroundColor + ';"></span>';
                
                if (body.includes('Click to exclude')) {
                  const dateIndex = context.tooltip.dataPoints[0].dataIndex;
                  const channelLabel = context.tooltip.dataPoints[0].dataset.label;
                  const metric = currentMetrics.find(m => 
                    (m.channel_name || m.channel_handle) === channelLabel && 
                    allDates[dateIndex] === m.date
                  );
                  
                  if (metric) {
                    innerHtml += '<tr><td>' + body[0] + '</td></tr>';
                    if (body[1]) {
                      innerHtml += '<tr><td>' + body[1] + '</td></tr>';
                    }
                    innerHtml += '<tr><td><button class="btn-exclude" onclick="excludeDay(' + metric.id + ')">Exclude Day</button></td></tr>';
                  }
                } else {
                  innerHtml += '<tr><td>' + span + ' ' + body + '</td></tr>';
                }
              });
              innerHtml += '</tbody>';

              const tableRoot = tooltipEl.querySelector('table');
              tableRoot.innerHTML = innerHtml;
            }

            const position = context.chart.canvas.getBoundingClientRect();

            // Display, position, and set styles for font
            tooltipEl.style.opacity = 1;
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
            tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
            tooltipEl.style.fontFamily = tooltipModel._bodyFontFamily;
            tooltipEl.style.fontSize = tooltipModel.bodyFontSize + 'px';
            tooltipEl.style.fontStyle = tooltipModel._bodyFontStyle;
            tooltipEl.style.padding = tooltipModel.yPadding + 'px ' + tooltipModel.xPadding + 'px';
            tooltipEl.style.pointerEvents = 'auto';
            tooltipEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            tooltipEl.style.color = 'white';
            tooltipEl.style.borderRadius = '6px';
          }
        },
        title: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value;
            },
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function updateRsiChart(rsiData, channelIds) {
  const rsiToggle = document.getElementById('rsiToggle');
  const rsiContainer = document.getElementById('rsiChartContainer');
  
  if (!rsiToggle.checked) {
    rsiContainer.style.display = 'none';
    if (rsiChart) {
      rsiChart.destroy();
      rsiChart = null;
    }
    return;
  }
  
  rsiContainer.style.display = 'block';
  
  if (!rsiData || Object.keys(rsiData).length === 0) {
    if (rsiChart) {
      rsiChart.destroy();
      rsiChart = null;
    }
    return;
  }

  const datasets = [];
  let allDates = new Set();

  channelIds.forEach((channelId, index) => {
    const channelRsiData = rsiData[channelId];
    if (!channelRsiData || channelRsiData.length === 0) {
      return;
    }

    const channel = allChannels.find(c => c.id === parseInt(channelId));
    const channelLabel = channel ? (channel.channel_name || channel.channel_handle) : `Channel ${channelId}`;
    const color = CHART_COLORS[index % CHART_COLORS.length];

    channelRsiData.forEach(item => allDates.add(item.date));

    const dateMap = {};
    channelRsiData.forEach(item => {
      dateMap[item.date] = item.rsi;
    });

    const sortedDates = Array.from(allDates).sort();
    const chartData = sortedDates.map(date => dateMap[date] !== undefined ? dateMap[date] : null);

    datasets.push({
      label: channelLabel,
      data: chartData,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      spanGaps: true
    });
  });

  const sortedDates = Array.from(allDates).sort();
  const labels = sortedDates.map(date => formatDate(date));

  if (rsiChart) {
    rsiChart.destroy();
  }

  const ctx = document.getElementById('rsiChart').getContext('2d');
  rsiChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          bodySpacing: 6,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              const rsiValue = context.parsed.y;
              label += rsiValue ? rsiValue.toFixed(2) : 'N/A';
              
              if (rsiValue >= 70) {
                label += ' (Heated/Euphoric)';
              } else if (rsiValue <= 30) {
                label += ' (Cooling/Fear)';
              }
              
              return label;
            }
          }
        },
        title: {
          display: false
        },
        annotation: {
          annotations: {
            overboughtLine: {
              type: 'line',
              yMin: 70,
              yMax: 70,
              borderColor: 'rgba(255, 99, 132, 0.5)',
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                content: 'Overbought (70)',
                enabled: true,
                position: 'end'
              }
            },
            oversoldLine: {
              type: 'line',
              yMin: 30,
              yMax: 30,
              borderColor: 'rgba(75, 192, 192, 0.5)',
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                content: 'Oversold (30)',
                enabled: true,
                position: 'end'
              }
            },
            overboughtZone: {
              type: 'box',
              yMin: 70,
              yMax: 100,
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              borderWidth: 0
            },
            oversoldZone: {
              type: 'box',
              yMin: 0,
              yMax: 30,
              backgroundColor: 'rgba(75, 192, 192, 0.1)',
              borderWidth: 0
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 10,
            callback: function(value) {
              return value;
            },
            font: {
              size: 11
            }
          },
          grid: {
            color: function(context) {
              if (context.tick.value === 70 || context.tick.value === 30) {
                return 'rgba(0, 0, 0, 0.2)';
              }
              return 'rgba(0, 0, 0, 0.05)';
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function updateSummaryStats(summaryData, metricsData) {
  if (!summaryData || !summaryData.summary) {
    resetSummaryStats();
    return;
  }
  
  const summary = summaryData.summary;
  
  document.getElementById('totalViews').textContent = formatNumber(summary.total_views);
  
  const avgDaily = summary.total_days > 0 
    ? Math.round(summary.total_views / summary.total_days)
    : 0;
  document.getElementById('avgDailyViews').textContent = formatNumber(avgDaily);
  
  const peakMetric = metricsData.reduce((max, metric) => {
    return metric.total_live_stream_views > (max?.total_live_stream_views || 0) 
      ? metric 
      : max;
  }, null);
  
  if (peakMetric) {
    document.getElementById('peakDay').textContent = formatDate(peakMetric.date);
    document.getElementById('peakDayViews').textContent = 
      formatNumber(peakMetric.total_live_stream_views) + ' views';
  } else {
    document.getElementById('peakDay').textContent = '-';
    document.getElementById('peakDayViews').textContent = '-';
  }
  
  if (summaryData.trend) {
    const trend = summaryData.trend;
    const trendIcon = document.getElementById('trendIcon');
    const trendValue = document.getElementById('trendValue');
    const trendPercent = document.getElementById('trendPercent');
    
    trendIcon.classList.remove('up', 'down', 'stable');
    
    if (trend.direction === 'up') {
      trendIcon.textContent = '📈';
      trendIcon.classList.add('up');
      trendValue.textContent = 'Increasing';
      trendPercent.textContent = `+${trend.percentage}%`;
      trendPercent.style.color = 'var(--success-color)';
    } else if (trend.direction === 'down') {
      trendIcon.textContent = '📉';
      trendIcon.classList.add('down');
      trendValue.textContent = 'Decreasing';
      trendPercent.textContent = `-${trend.percentage}%`;
      trendPercent.style.color = 'var(--error-color)';
    } else {
      trendIcon.textContent = '➡️';
      trendIcon.classList.add('stable');
      trendValue.textContent = 'Stable';
      trendPercent.textContent = `${trend.percentage}%`;
      trendPercent.style.color = 'var(--text-secondary)';
    }
  } else {
    resetTrendStats();
  }
}

function resetSummaryStats() {
  document.getElementById('totalViews').textContent = '-';
  document.getElementById('avgDailyViews').textContent = '-';
  document.getElementById('peakDay').textContent = '-';
  document.getElementById('peakDayViews').textContent = '-';
  resetTrendStats();
}

function resetTrendStats() {
  const trendIcon = document.getElementById('trendIcon');
  trendIcon.textContent = '➡️';
  trendIcon.className = 'stat-icon trend-icon';
  document.getElementById('trendValue').textContent = '-';
  document.getElementById('trendPercent').textContent = '-';
}

function updateBtcChart(btcData) {
  if (!btcData || btcData.length === 0) {
    if (btcChart) {
      btcChart.destroy();
      btcChart = null;
    }
    return;
  }

  const dates = btcData.map(d => formatDate(d.date));
  const prices = btcData.map(d => d.close);

  if (btcChart) {
    btcChart.destroy();
  }

  const ctx = document.getElementById('btcChart').getContext('2d');
  btcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'BTC Price (USD)',
        data: prices,
        borderColor: '#f7931a',
        backgroundColor: 'rgba(247, 147, 26, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#f7931a',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          bodySpacing: 6,
          callbacks: {
            label: function(context) {
              const dataPoint = btcData[context.dataIndex];
              return [
                `Close: $${dataPoint.close.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                `High: $${dataPoint.high.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                `Low: $${dataPoint.low.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
              ];
            }
          }
        },
        title: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            },
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function updateFngChart(fngData) {
  if (!fngData || fngData.length === 0) {
    if (fngChart) {
      fngChart.destroy();
      fngChart = null;
    }
    return;
  }

  const dates = fngData.map(d => formatDate(d.date));
  const values = fngData.map(d => d.value);

  if (fngChart) {
    fngChart.destroy();
  }

  const ctx = document.getElementById('fngChart').getContext('2d');
  fngChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Fear & Greed Index',
        data: values,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: function(context) {
          const value = context.parsed.y;
          if (value <= 24) return '#dc2626';
          if (value <= 49) return '#f97316';
          if (value <= 74) return '#fbbf24';
          return '#10b981';
        },
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        segment: {
          borderColor: function(context) {
            const value = context.p1.parsed.y;
            if (value <= 24) return '#dc2626';
            if (value <= 49) return '#f97316';
            if (value <= 74) return '#fbbf24';
            return '#10b981';
          }
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          bodySpacing: 6,
          callbacks: {
            label: function(context) {
              const dataPoint = fngData[context.dataIndex];
              return [
                `Value: ${dataPoint.value}`,
                `Classification: ${dataPoint.classification}`
              ];
            }
          }
        },
        title: {
          display: false
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
            callback: function(value) {
              return value;
            },
            font: {
              size: 11
            }
          },
          grid: {
            color: function(context) {
              if (context.tick.value === 25 || context.tick.value === 50 || context.tick.value === 75) {
                return 'rgba(0, 0, 0, 0.2)';
              }
              return 'rgba(0, 0, 0, 0.05)';
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function updateVsiChart(vsiData, channelIds) {
  if (!vsiData || Object.keys(vsiData).length === 0) {
    if (vsiChart) {
      vsiChart.destroy();
      vsiChart = null;
    }
    // Clear current VSI display
    document.getElementById('currentVsiValue').textContent = '-';
    document.getElementById('currentVsiClassification').textContent = '-';
    document.getElementById('currentVsiClassification').className = 'current-vsi-classification';
    document.getElementById('currentVsiTrend').textContent = '-';
    return;
  }

  const datasets = [];
  let allDates = new Set();

  channelIds.forEach((channelId, index) => {
    const channelVsiData = vsiData[channelId];
    if (!channelVsiData || channelVsiData.length === 0) {
      return;
    }

    const channel = allChannels.find(c => c.id === parseInt(channelId));
    const channelLabel = channel ? (channel.channel_name || channel.channel_handle) : `Channel ${channelId}`;
    const color = CHART_COLORS[index % CHART_COLORS.length];

    channelVsiData.forEach(item => allDates.add(item.date));

    const dateMap = {};
    channelVsiData.forEach(item => {
      dateMap[item.date] = item.vsi;
    });

    const sortedDates = Array.from(allDates).sort();
    const chartData = sortedDates.map(date => dateMap[date] !== undefined ? dateMap[date] : null);

    datasets.push({
      label: channelLabel,
      data: chartData,
      borderColor: color,
      backgroundColor: 'transparent',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: function(context) {
        const value = context.parsed.y;
        if (value === null || value === undefined) return '#9ca3af';
        if (value <= 10) return '#16a34a';
        if (value <= 30) return '#4ade80';
        if (value <= 70) return '#9ca3af';
        if (value <= 90) return '#fb923c';
        return '#dc2626';
      },
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      segment: {
        borderColor: function(context) {
          const value = context.p1?.parsed?.y;
          if (value === null || value === undefined) return '#9ca3af';
          if (value <= 10) return '#16a34a';
          if (value <= 30) return '#4ade80';
          if (value <= 70) return '#9ca3af';
          if (value <= 90) return '#fb923c';
          return '#dc2626';
        }
      },
      spanGaps: true
    });
  });

  const sortedDates = Array.from(allDates).sort();
  const labels = sortedDates.map(date => formatDate(date));

  if (vsiChart) {
    vsiChart.destroy();
  }

  // Update current VSI display
  updateCurrentVsiDisplay(vsiData, channelIds);

  const ctx = document.getElementById('vsiChart').getContext('2d');
  vsiChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.5,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          bodySpacing: 6,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              if (value === null || value === undefined) {
                return `${context.dataset.label}: No Data`;
              }
              
              const label = getVSILabel(value);
              const signal = value <= 10 ? ' (Buy Signal)' : value >= 90 ? ' (Sell Signal)' : '';
              return [
                `${context.dataset.label}: ${value.toFixed(2)}`,
                `Classification: ${label}${signal}`
              ];
            }
          }
        },
        title: {
          display: false
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 10,
            callback: function(value) {
              return value;
            },
            font: {
              size: 11
            }
          },
          grid: {
            color: function(context) {
              if (context.tick.value === 10 || context.tick.value === 30 || 
                  context.tick.value === 70 || context.tick.value === 90) {
                return 'rgba(0, 0, 0, 0.2)';
              }
              return 'rgba(0, 0, 0, 0.05)';
            }
          }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            font: {
              size: 10
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function updateCurrentVsiDisplay(vsiData, channelIds) {
  // Get the most recent VSI value from the first channel
  const channelId = channelIds[0];
  const channelVsiData = vsiData[channelId];
  
  if (!channelVsiData || channelVsiData.length === 0) {
    document.getElementById('currentVsiValue').textContent = '-';
    document.getElementById('currentVsiClassification').textContent = '-';
    document.getElementById('currentVsiClassification').className = 'current-vsi-classification';
    document.getElementById('currentVsiTrend').textContent = '-';
    return;
  }

  // Sort by date and get most recent value
  const sortedData = channelVsiData
    .filter(item => item.vsi !== null && item.vsi !== undefined)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sortedData.length === 0) {
    document.getElementById('currentVsiValue').textContent = '-';
    document.getElementById('currentVsiClassification').textContent = '-';
    document.getElementById('currentVsiClassification').className = 'current-vsi-classification';
    document.getElementById('currentVsiTrend').textContent = '-';
    return;
  }

  const currentVsi = sortedData[0].vsi;
  const previousVsi = sortedData[1]?.vsi;

  // Update current value
  document.getElementById('currentVsiValue').textContent = currentVsi.toFixed(2);

  // Update classification
  const classification = getVSILabel(currentVsi);
  const classificationClass = getVSIClassification(currentVsi);
  const classificationEl = document.getElementById('currentVsiClassification');
  classificationEl.textContent = classification;
  classificationEl.className = `current-vsi-classification ${classificationClass}`;

  // Update trend
  const trendEl = document.getElementById('currentVsiTrend');
  if (previousVsi !== null && previousVsi !== undefined) {
    const change = currentVsi - previousVsi;
    const changePercent = previousVsi > 0 ? (change / previousVsi * 100).toFixed(1) : 0;
    const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    const color = change > 0 ? '#dc2626' : change < 0 ? '#16a34a' : '#9ca3af';
    trendEl.innerHTML = `<span style="color: ${color}">${arrow} ${Math.abs(changePercent)}%</span>`;
  } else {
    trendEl.textContent = 'No trend data';
  }
}

// Helper functions for VSI categorization
function getVSILabel(vsi) {
  if (vsi === null || vsi === undefined) {
    return 'No Data';
  }
  
  if (vsi <= 10) {
    return 'Extreme Disinterest';
  } else if (vsi <= 30) {
    return 'Low Interest';
  } else if (vsi <= 70) {
    return 'Normal';
  } else if (vsi <= 90) {
    return 'High Interest';
  } else {
    return 'Extreme Hype';
  }
}

function getVSIColor(vsi) {
  if (vsi === null || vsi === undefined) {
    return '#9ca3af'; // Gray
  }
  
  if (vsi <= 10) {
    return '#16a34a'; // Dark Green
  } else if (vsi <= 30) {
    return '#4ade80'; // Light Green
  } else if (vsi <= 70) {
    return '#9ca3af'; // Gray
  } else if (vsi <= 90) {
    return '#fb923c'; // Orange
  } else {
    return '#dc2626'; // Dark Red
  }
}

function getVSIClassification(vsi) {
  if (vsi === null || vsi === undefined) {
    return 'normal';
  }
  
  if (vsi <= 10) {
    return 'extreme-disinterest';
  } else if (vsi <= 30) {
    return 'low-interest';
  } else if (vsi <= 70) {
    return 'normal';
  } else if (vsi <= 90) {
    return 'high-interest';
  } else {
    return 'extreme-hype';
  }
}


async function collectHistoricalData() {
  const startDateInput = document.getElementById('collectStartDate');
  const endDateInput = document.getElementById('collectEndDate');
  const btn = document.getElementById('collectDataBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (!startDate || !endDate) {
    showFeedback('collectionFeedback', 'Please select both start and end dates', 'error');
    return;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    showFeedback('collectionFeedback', 'Start date must be before or equal to end date', 'error');
    return;
  }
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 365) {
    showFeedback('collectionFeedback', 'Date range cannot exceed 365 days', 'error');
    return;
  }
  
  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  
  try {
    const response = await fetch(`${API_BASE_URL}/collect-metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to collect metrics');
    }
    
    const successMsg = `Successfully collected data! Processed ${result.data.successful} channel(s)`;
    showFeedback('collectionFeedback', successMsg, 'success');
    
    startDateInput.value = '';
    endDateInput.value = '';
    
    setTimeout(() => {
      fetchMetrics();
    }, 1500);
    
  } catch (error) {
    console.error('Error collecting metrics:', error);
    showFeedback('collectionFeedback', error.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

async function recalculateData() {
  const startDateInput = document.getElementById('recalcStartDate');
  const endDateInput = document.getElementById('recalcEndDate');
  const btn = document.getElementById('recalculateDataBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (!startDate || !endDate) {
    showFeedback('recalculationFeedback', 'Please select both start and end dates', 'error');
    return;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    showFeedback('recalculationFeedback', 'Start date must be before or equal to end date', 'error');
    return;
  }
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 365) {
    showFeedback('recalculationFeedback', 'Date range cannot exceed 365 days', 'error');
    return;
  }
  
  const confirmMsg = `This will re-fetch and recalculate data from ${startDate} to ${endDate} using peak (MAX) aggregation. Continue?`;
  if (!confirm(confirmMsg)) {
    return;
  }
  
  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  
  try {
    const response = await fetch(`${API_BASE_URL}/collect-metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        verbose: true
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to recalculate metrics');
    }
    
    const successMsg = `Successfully recalculated data with peak aggregation! Processed ${result.data.successful} channel(s).`;
    showFeedback('recalculationFeedback', successMsg, 'success');
    
    console.log('Recalculation results:', result);
    
    setTimeout(() => {
      fetchMetrics();
    }, 1500);
    
  } catch (error) {
    console.error('Error recalculating metrics:', error);
    showFeedback('recalculationFeedback', error.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

function initializeCollectionDates() {
  const endDate = getDateDaysAgo(1);
  const startDate = getDateDaysAgo(30);
  
  document.getElementById('collectStartDate').value = startDate;
  document.getElementById('collectEndDate').value = endDate;
}

function initializeRecalcDates() {
  const endDate = getDateDaysAgo(1);
  const startDate = getDateDaysAgo(90);
  
  document.getElementById('recalcStartDate').value = startDate;
  document.getElementById('recalcEndDate').value = endDate;
}

function initializeMarketCollectionDates() {
  const endDate = getDateDaysAgo(1);
  const startDate = getDateDaysAgo(90);
  
  document.getElementById('marketCollectStartDate').value = startDate;
  document.getElementById('marketCollectEndDate').value = endDate;
}

async function collectMarketData() {
  const startDateInput = document.getElementById('marketCollectStartDate');
  const endDateInput = document.getElementById('marketCollectEndDate');
  const btn = document.getElementById('collectMarketDataBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');
  
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (!startDate || !endDate) {
    showFeedback('marketCollectionFeedback', 'Please select both start and end dates', 'error');
    return;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    showFeedback('marketCollectionFeedback', 'Start date must be before or equal to end date', 'error');
    return;
  }
  
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 365) {
    showFeedback('marketCollectionFeedback', 'Date range cannot exceed 365 days', 'error');
    return;
  }
  
  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  
  try {
    const response = await fetch(`${API_BASE_URL}/collect-market-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to collect market data');
    }
    
    const btcCount = result.results?.btc?.totalCount || 0;
    const fngCount = result.results?.fearGreed?.totalCount || 0;
    const successMsg = `Successfully collected market data! BTC: ${btcCount} records, Fear & Greed: ${fngCount} records`;
    showFeedback('marketCollectionFeedback', successMsg, 'success');
    
    console.log('Market data collection results:', result);
    
    setTimeout(() => {
      fetchMetrics();
    }, 1500);
    
  } catch (error) {
    console.error('Error collecting market data:', error);
    showFeedback('marketCollectionFeedback', error.message, 'error');
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

function setupEventListeners() {
  document.getElementById('addChannelBtn').addEventListener('click', addChannel);
  
  document.getElementById('channelHandleInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addChannel();
    }
  });
  
  document.getElementById('applyFiltersBtn').addEventListener('click', fetchMetrics);
  
  document.getElementById('collectDataBtn').addEventListener('click', collectHistoricalData);
  
  document.getElementById('recalculateDataBtn').addEventListener('click', recalculateData);
  
  document.getElementById('collectMarketDataBtn').addEventListener('click', collectMarketData);
  
  document.getElementById('rsiPeriod').addEventListener('change', (e) => {
    currentRsiPeriod = parseInt(e.target.value, 10);
    const channelIds = getSelectedChannelIds();
    if (currentMetrics.length > 0 && channelIds.length > 0) {
      fetchMetrics();
    }
  });
  
  document.getElementById('rsiToggle').addEventListener('change', () => {
    const channelIds = getSelectedChannelIds();
    if (currentRsiData && Object.keys(currentRsiData).length > 0) {
      updateRsiChart(currentRsiData, channelIds);
    }
  });

  document.getElementById('showVsiOverlay').addEventListener('change', () => {
    if (currentViewMode === 'overlay') {
      updateOverlayChart();
    }
  });

  document.getElementById('ma7Toggle').addEventListener('change', () => {
    if (currentMetrics.length > 0) {
      updateChart(currentMetrics);
    }
  });

  document.getElementById('showExcludedToggle').addEventListener('change', () => {
    const channelIds = getSelectedChannelIds();
    if (channelIds.length > 0) {
      fetchMetrics();
    }
  });

  document.getElementById('stackedViewBtn').addEventListener('click', () => {
    toggleView('stacked');
  });
  
  document.getElementById('overlayViewBtn').addEventListener('click', () => {
    toggleView('overlay');
  });
  
  document.getElementById('showRsiOverlay').addEventListener('change', () => {
    if (currentViewMode === 'overlay') {
      updateOverlayChart();
    }
  });
  
  document.getElementById('normalizeOverlay').addEventListener('change', () => {
    if (currentViewMode === 'overlay') {
      updateOverlayChart();
    }
  });
  
  document.getElementById('exportDataBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleExportDropdown();
  });
  
  document.querySelectorAll('.dropdown-item[data-format]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const format = e.currentTarget.dataset.format;
      exportData(format);
    });
  });
  
  document.getElementById('copyPromptBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    copyAIPrompt();
  });
  
  document.addEventListener('click', (e) => {
    const dropdown = document.querySelector('.export-dropdown');
    const dropdownContent = document.getElementById('exportDropdown');
    if (!dropdown.contains(e.target)) {
      dropdownContent.style.display = 'none';
      dropdown.classList.remove('active');
    }
  });
}

function toggleExportDropdown() {
  const dropdown = document.querySelector('.export-dropdown');
  const dropdownContent = document.getElementById('exportDropdown');
  
  if (dropdownContent.style.display === 'none' || !dropdownContent.style.display) {
    dropdownContent.style.display = 'block';
    dropdown.classList.add('active');
  } else {
    dropdownContent.style.display = 'none';
    dropdown.classList.remove('active');
  }
}

async function exportData(format) {
  try {
    const channelSelector = document.getElementById('channelSelector');
    const selectedChannels = Array.from(channelSelector.selectedOptions).map(option => option.value);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
      alert('Please select a date range first using the filters above.');
      return;
    }
    
    if (selectedChannels.length === 0) {
      alert('Please select at least one channel from the filters above.');
      return;
    }
    
    const showExcluded = document.getElementById('showExcludedToggle').checked;
    const params = new URLSearchParams({
      format: format,
      start_date: startDate,
      end_date: endDate,
      channels: selectedChannels.join(','),
      rsi_period: currentRsiPeriod,
      include_excluded: showExcluded
    });
    
    const exportUrl = `${API_BASE_URL}/export/data?${params.toString()}`;
    
    const exportBtn = document.getElementById('exportDataBtn');
    const originalContent = exportBtn.innerHTML;
    exportBtn.innerHTML = '<span>⏳ Exporting...</span>';
    exportBtn.disabled = true;
    
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Export failed');
    }
    
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `sentiment-data-${startDate}-to-${endDate}.${format}`;
    
    if (contentDisposition) {
      const matches = /filename="([^"]+)"/.exec(contentDisposition);
      if (matches && matches[1]) {
        filename = matches[1];
      }
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    exportBtn.innerHTML = originalContent;
    exportBtn.disabled = false;
    
    const dropdown = document.querySelector('.export-dropdown');
    const dropdownContent = document.getElementById('exportDropdown');
    dropdownContent.style.display = 'none';
    dropdown.classList.remove('active');
    
    const tempMsg = document.createElement('div');
    tempMsg.className = 'feedback-message success';
    tempMsg.textContent = `✓ Data exported successfully as ${format.toUpperCase()}!`;
    tempMsg.style.position = 'fixed';
    tempMsg.style.top = '20px';
    tempMsg.style.right = '20px';
    tempMsg.style.zIndex = '10000';
    tempMsg.style.padding = '15px 20px';
    tempMsg.style.borderRadius = '8px';
    tempMsg.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    document.body.appendChild(tempMsg);
    
    setTimeout(() => {
      tempMsg.remove();
    }, 3000);
    
  } catch (error) {
    console.error('Error exporting data:', error);
    alert(`Failed to export data: ${error.message}`);
    
    const exportBtn = document.getElementById('exportDataBtn');
    exportBtn.innerHTML = '<span>📥 Export Data</span><span class="dropdown-arrow">▼</span>';
    exportBtn.disabled = false;
  }
}

function copyAIPrompt() {
  const prompt = `Analyze this cryptocurrency sentiment data containing YouTube live stream views, Crypto Fear & Greed Index, and Bitcoin prices.

Please:
1. Identify correlations between these metrics
2. Find if YouTube views lead or lag Bitcoin price movements
3. Discover patterns where high/low views predict price changes
4. Suggest optimal combinations for buy/sell signals
5. Identify any divergences or anomalies

Focus on actionable trading insights and provide specific recommendations based on the data patterns you observe.`;

  navigator.clipboard.writeText(prompt).then(() => {
    const btn = document.getElementById('copyPromptBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="dropdown-icon">✓</span><span>Copied to clipboard!</span>';
    btn.style.backgroundColor = 'var(--success-color)';
    btn.style.color = 'white';
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.backgroundColor = '';
      btn.style.color = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy prompt:', err);
    alert('Failed to copy prompt to clipboard. Please copy it manually from the console.');
    console.log('AI Analysis Prompt:\n\n' + prompt);
  });
}

async function init() {
  setupEventListeners();
  setupDatePresets();
  initializeDateRange(90);
  initializeCollectionDates();
  initializeRecalcDates();
  initializeMarketCollectionDates();
  await fetchChannels();
  
  if (allChannels.length > 0) {
    document.getElementById('noDataMessage').style.display = 'block';
  }
}

// Excluded days functionality
let currentExcludedDays = [];

async function fetchExcludedDays() {
  try {
    const response = await fetch(`${API_BASE_URL}/metrics/excluded`);
    if (!response.ok) {
      throw new Error('Failed to fetch excluded days');
    }
    
    const result = await response.json();
    currentExcludedDays = result.data || [];
    updateExcludedDaysUI();
  } catch (error) {
    console.error('Error fetching excluded days:', error);
  }
}

function updateExcludedDaysUI() {
  const section = document.querySelector('.excluded-days-section');
  const countEl = document.getElementById('excludedCount');
  const listEl = document.getElementById('excludedDaysList');
  
  countEl.textContent = currentExcludedDays.length;
  
  if (currentExcludedDays.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  
  listEl.innerHTML = currentExcludedDays.map(day => `
    <div class="excluded-day-item">
      <div class="excluded-day-info">
        <div class="excluded-day-date">${formatDate(day.date)}</div>
        <div class="excluded-day-details">
          ${day.channel_name} • ${formatNumber(day.total_live_stream_views)} views
        </div>
      </div>
      <div class="excluded-day-actions">
        <button class="btn-restore" onclick="restoreExcludedDay(${day.id})">
          Restore
        </button>
      </div>
    </div>
  `).join('');
}

async function excludeDay(metricId) {
  try {
    const response = await fetch(`${API_BASE_URL}/metrics/${metricId}/exclude`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to exclude day');
    }
    
    const result = await response.json();
    showFeedback('addChannelFeedback', 'Day excluded successfully', 'success');
    
    // Refresh data
    await fetchExcludedDays();
    await fetchMetrics();
  } catch (error) {
    console.error('Error excluding day:', error);
    showFeedback('addChannelFeedback', 'Failed to exclude day', 'error');
  }
}

async function restoreExcludedDay(metricId) {
  try {
    const response = await fetch(`${API_BASE_URL}/metrics/${metricId}/restore`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to restore day');
    }
    
    const result = await response.json();
    showFeedback('addChannelFeedback', 'Day restored successfully', 'success');
    
    // Refresh data
    await fetchExcludedDays();
    await fetchMetrics();
  } catch (error) {
    console.error('Error restoring day:', error);
    showFeedback('addChannelFeedback', 'Failed to restore day', 'error');
  }
}

// Add exclude button to chart tooltips
function addExcludeButtonToChart(chart, metric) {
  const canvas = chart.canvas;
  const excludeBtn = document.createElement('button');
  excludeBtn.className = 'btn-exclude';
  excludeBtn.textContent = 'Exclude Day';
  excludeBtn.onclick = () => excludeDay(metric.id);
  
  // Position the button near the chart point
  const rect = canvas.getBoundingClientRect();
  excludeBtn.style.position = 'absolute';
  excludeBtn.style.top = `${rect.top + 10}px`;
  excludeBtn.style.left = `${rect.right - 100}px`;
  excludeBtn.style.zIndex = '1000';
  
  document.body.appendChild(excludeBtn);
  
  // Remove button after 3 seconds
  setTimeout(() => {
    if (excludeBtn.parentNode) {
      excludeBtn.parentNode.removeChild(excludeBtn);
    }
  }, 3000);
}

document.addEventListener('DOMContentLoaded', init);
