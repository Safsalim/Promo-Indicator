const API_BASE_URL = 'http://localhost:3000/api';

let viewsChart = null;
let rsiChart = null;
let allChannels = [];
let currentMetrics = [];
let currentRsiData = {};
let currentRsiPeriod = 14;

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
    const params = new URLSearchParams({
      channel_ids: channelIds.join(','),
      start_date: startDate,
      end_date: endDate,
      rsi_period: currentRsiPeriod
    });
    
    const [metricsResponse, summaryResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/metrics?${params}`),
      fetch(`${API_BASE_URL}/metrics/summary?${params}`)
    ]);
    
    if (!metricsResponse.ok || !summaryResponse.ok) {
      throw new Error('Failed to fetch metrics data');
    }
    
    const metricsResult = await metricsResponse.json();
    const summaryResult = await summaryResponse.json();
    
    currentMetrics = metricsResult.data || [];
    currentRsiData = metricsResult.rsi || {};
    
    if (currentMetrics.length === 0) {
      showNoData();
    } else {
      updateChart(currentMetrics);
      updateRsiChart(currentRsiData, channelIds);
      updateSummaryStats(summaryResult.data, currentMetrics);
      document.getElementById('noDataMessage').style.display = 'none';
    }
    
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
  
  resetSummaryStats();
}

function updateChart(metrics) {
  const groupedByChannel = {};
  
  metrics.forEach(metric => {
    const channelId = metric.channel_id;
    if (!groupedByChannel[channelId]) {
      groupedByChannel[channelId] = {
        label: metric.channel_name || metric.channel_handle,
        data: []
      };
    }
    groupedByChannel[channelId].data.push({
      date: metric.date,
      views: metric.total_live_stream_views
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
              label += formatNumber(context.parsed.y) + ' views';
              return label;
            }
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

function initializeCollectionDates() {
  const endDate = getDateDaysAgo(1);
  const startDate = getDateDaysAgo(30);
  
  document.getElementById('collectStartDate').value = startDate;
  document.getElementById('collectEndDate').value = endDate;
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
}

async function init() {
  setupEventListeners();
  setupDatePresets();
  initializeDateRange(90);
  initializeCollectionDates();
  await fetchChannels();
  
  if (allChannels.length > 0) {
    document.getElementById('noDataMessage').style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', init);
