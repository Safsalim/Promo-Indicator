// Overlay Chart Functionality

function toggleView(viewMode) {
  currentViewMode = viewMode;
  
  const stackedBtn = document.getElementById('stackedViewBtn');
  const overlayBtn = document.getElementById('overlayViewBtn');
  const overlaySection = document.getElementById('overlayChartSection');
  const viewsSection = document.getElementById('viewsChartSection');
  const rsiSection = document.querySelector('.rsi-section');
  const btcSection = document.querySelector('.btc-section');
  const fngSection = document.querySelector('.fng-section');
  
  if (viewMode === 'overlay') {
    stackedBtn.classList.remove('active');
    overlayBtn.classList.add('active');
    overlaySection.style.display = 'block';
    viewsSection.style.display = 'none';
    rsiSection.style.display = 'none';
    btcSection.style.display = 'none';
    fngSection.style.display = 'none';
    
    if (currentMetrics.length > 0 || currentBtcData.length > 0 || currentFngData.length > 0) {
      updateOverlayChart();
    }
  } else {
    stackedBtn.classList.add('active');
    overlayBtn.classList.remove('active');
    overlaySection.style.display = 'none';
    viewsSection.style.display = 'block';
    rsiSection.style.display = 'block';
    btcSection.style.display = 'block';
    fngSection.style.display = 'block';
  }
}

function normalizeToScale(data, min, max) {
  if (min === max) return data.map(() => 50);
  return data.map(value => {
    if (value === null || value === undefined) return null;
    return ((value - min) / (max - min)) * 100;
  });
}

function updateOverlayChart() {
  const showRsi = document.getElementById('showRsiOverlay').checked;
  const normalize = document.getElementById('normalizeOverlay').checked;
  
  const allDates = new Set();
  const datasets = [];
  
  if (currentMetrics.length === 0 && currentBtcData.length === 0 && currentFngData.length === 0) {
    if (overlayChart) {
      overlayChart.destroy();
      overlayChart = null;
    }
    return;
  }
  
  const viewsDateMap = {};
  if (currentMetrics.length > 0) {
    currentMetrics.forEach(metric => {
      allDates.add(metric.date);
      if (!viewsDateMap[metric.date]) {
        viewsDateMap[metric.date] = 0;
      }
      viewsDateMap[metric.date] += metric.total_live_stream_views;
    });
  }
  
  const btcDateMap = {};
  if (currentBtcData.length > 0) {
    currentBtcData.forEach(btc => {
      allDates.add(btc.date);
      btcDateMap[btc.date] = btc.close;
    });
  }
  
  const fngDateMap = {};
  if (currentFngData.length > 0) {
    currentFngData.forEach(fng => {
      allDates.add(fng.date);
      fngDateMap[fng.date] = fng.value;
    });
  }
  
  const sortedDates = Array.from(allDates).sort();
  const labels = sortedDates.map(date => formatDate(date));
  
  const viewsData = sortedDates.map(date => viewsDateMap[date] || null);
  const btcData = sortedDates.map(date => btcDateMap[date] || null);
  const fngData = sortedDates.map(date => fngDateMap[date] || null);
  
  let processedViewsData = viewsData;
  let processedBtcData = btcData;
  let processedFngData = fngData;
  
  if (normalize) {
    const viewsMin = Math.min(...viewsData.filter(v => v !== null));
    const viewsMax = Math.max(...viewsData.filter(v => v !== null));
    const btcMin = Math.min(...btcData.filter(v => v !== null));
    const btcMax = Math.max(...btcData.filter(v => v !== null));
    const fngMin = Math.min(...fngData.filter(v => v !== null));
    const fngMax = Math.max(...fngData.filter(v => v !== null));
    
    processedViewsData = normalizeToScale(viewsData, viewsMin, viewsMax);
    processedBtcData = normalizeToScale(btcData, btcMin, btcMax);
    processedFngData = normalizeToScale(fngData, fngMin, fngMax);
  }
  
  if (currentMetrics.length > 0) {
    datasets.push({
      label: 'YouTube Views',
      data: processedViewsData,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#3B82F6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      yAxisID: normalize ? 'y-normalized' : 'y-views',
      spanGaps: true
    });
  }
  
  if (currentFngData.length > 0) {
    datasets.push({
      label: 'Fear & Greed Index',
      data: processedFngData,
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#F59E0B',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      yAxisID: normalize ? 'y-normalized' : 'y-fng',
      spanGaps: true,
      segment: {
        borderColor: function(context) {
          if (normalize) return '#F59E0B';
          const value = context.p1.parsed.y;
          if (value <= 24) return '#dc2626';
          if (value <= 49) return '#f97316';
          if (value <= 74) return '#fbbf24';
          return '#10b981';
        }
      }
    });
  }
  
  if (currentBtcData.length > 0) {
    datasets.push({
      label: 'BTC Price',
      data: processedBtcData,
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#10B981',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      yAxisID: normalize ? 'y-normalized' : 'y-btc',
      spanGaps: true
    });
  }
  
  if (showRsi && currentRsiData && Object.keys(currentRsiData).length > 0) {
    const channelIds = getSelectedChannelIds();
    if (channelIds.length > 0) {
      const firstChannelId = channelIds[0];
      const channelRsiData = currentRsiData[firstChannelId];
      if (channelRsiData && channelRsiData.length > 0) {
        const rsiDateMap = {};
        channelRsiData.forEach(item => {
          rsiDateMap[item.date] = item.rsi;
        });
        const rsiData = sortedDates.map(date => rsiDateMap[date] || null);
        
        datasets.push({
          label: 'RSI',
          data: rsiData,
          borderColor: '#A855F7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#A855F7',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          yAxisID: normalize ? 'y-normalized' : 'y-fng',
          spanGaps: true,
          borderDash: [5, 5]
        });
      }
    }
  }
  
  const scales = normalize ? {
    'y-normalized': {
      position: 'left',
      min: 0,
      max: 100,
      title: {
        display: true,
        text: 'Normalized Scale (0-100)',
        font: {
          size: 12,
          weight: 'bold'
        }
      },
      ticks: {
        callback: function(value) {
          return value.toFixed(0);
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
  } : {
    'y-views': {
      position: 'left',
      beginAtZero: true,
      title: {
        display: true,
        text: 'YouTube Views',
        color: '#3B82F6',
        font: {
          size: 12,
          weight: 'bold'
        }
      },
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
        },
        color: '#3B82F6'
      },
      grid: {
        color: 'rgba(59, 130, 246, 0.1)'
      }
    },
    'y-fng': {
      position: 'left',
      offset: true,
      min: 0,
      max: 100,
      title: {
        display: true,
        text: 'Fear & Greed / RSI',
        color: '#F59E0B',
        font: {
          size: 12,
          weight: 'bold'
        }
      },
      ticks: {
        stepSize: 25,
        font: {
          size: 11
        },
        color: '#F59E0B'
      },
      grid: {
        drawOnChartArea: false
      }
    },
    'y-btc': {
      position: 'right',
      beginAtZero: false,
      title: {
        display: true,
        text: 'BTC Price (USD)',
        color: '#10B981',
        font: {
          size: 12,
          weight: 'bold'
        }
      },
      ticks: {
        callback: function(value) {
          return '$' + value.toLocaleString();
        },
        font: {
          size: 11
        },
        color: '#10B981'
      },
      grid: {
        drawOnChartArea: false
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
  };
  
  if (overlayChart) {
    overlayChart.destroy();
  }
  
  const ctx = document.getElementById('overlayChart').getContext('2d');
  overlayChart = new Chart(ctx, {
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
              size: 13,
              weight: '600'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: 15,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          bodySpacing: 8,
          callbacks: {
            label: function(context) {
              const datasetLabel = context.dataset.label;
              const value = context.parsed.y;
              
              if (value === null) return null;
              
              if (normalize) {
                return `${datasetLabel}: ${value.toFixed(2)}`;
              }
              
              if (datasetLabel === 'YouTube Views') {
                return `${datasetLabel}: ${formatNumber(value)} views`;
              } else if (datasetLabel === 'BTC Price') {
                return `${datasetLabel}: $${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
              } else if (datasetLabel === 'Fear & Greed Index') {
                const dateIndex = context.dataIndex;
                const date = sortedDates[dateIndex];
                const fngPoint = currentFngData.find(f => f.date === date);
                if (fngPoint) {
                  return [`${datasetLabel}: ${value.toFixed(0)}`, `(${fngPoint.classification})`];
                }
                return `${datasetLabel}: ${value.toFixed(0)}`;
              } else if (datasetLabel === 'RSI') {
                return `${datasetLabel}: ${value.toFixed(2)}`;
              }
              
              return `${datasetLabel}: ${value}`;
            }
          }
        },
        title: {
          display: false
        }
      },
      scales: scales
    }
  });
}
