const API_BASE_URL = 'http://localhost:3000/api';

let viewsChart = null;
let engagementChart = null;

document.getElementById('searchBtn').addEventListener('click', async () => {
  const videoId = document.getElementById('videoIdInput').value.trim();
  
  if (!videoId) {
    alert('Please enter a video ID');
    return;
  }
  
  await fetchVideoData(videoId);
});

async function fetchVideoData(videoId) {
  try {
    const response = await fetch(`${API_BASE_URL}/youtube/video/${videoId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch video data');
    }
    
    const data = await response.json();
    displayVideoInfo(data);
    await fetchVideoStats(videoId);
    await fetchPromoIndicators(videoId);
  } catch (error) {
    console.error('Error:', error);
    alert('Error fetching video data. Please check the video ID and try again.');
  }
}

function displayVideoInfo(video) {
  const videoInfoSection = document.getElementById('videoInfo');
  const videoDetails = document.getElementById('videoDetails');
  
  videoDetails.innerHTML = `
    <h3>${video.snippet.title}</h3>
    <p><strong>Channel:</strong> ${video.snippet.channelTitle}</p>
    <p><strong>Published:</strong> ${new Date(video.snippet.publishedAt).toLocaleDateString()}</p>
    <p><strong>Views:</strong> ${parseInt(video.statistics.viewCount).toLocaleString()}</p>
    <p><strong>Likes:</strong> ${parseInt(video.statistics.likeCount).toLocaleString()}</p>
    <p><strong>Comments:</strong> ${parseInt(video.statistics.commentCount).toLocaleString()}</p>
  `;
  
  videoInfoSection.style.display = 'block';
}

async function fetchVideoStats(videoId) {
  try {
    const response = await fetch(`${API_BASE_URL}/promo/stats/${videoId}`);
    
    if (!response.ok) {
      console.log('No historical stats available');
      return;
    }
    
    const stats = await response.json();
    
    if (stats.length > 0) {
      updateCharts(stats);
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

function updateCharts(stats) {
  const labels = stats.map(s => new Date(s.recorded_at).toLocaleDateString()).reverse();
  const views = stats.map(s => s.view_count).reverse();
  const likes = stats.map(s => s.like_count).reverse();
  const comments = stats.map(s => s.comment_count).reverse();
  
  if (viewsChart) {
    viewsChart.destroy();
  }
  
  const viewsCtx = document.getElementById('viewsChart').getContext('2d');
  viewsChart = new Chart(viewsCtx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Views',
        data: views,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'View Count Over Time'
        }
      }
    }
  });
  
  if (engagementChart) {
    engagementChart.destroy();
  }
  
  const engagementCtx = document.getElementById('engagementChart').getContext('2d');
  engagementChart = new Chart(engagementCtx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Likes',
          data: likes,
          borderColor: '#764ba2',
          backgroundColor: 'rgba(118, 75, 162, 0.1)',
          tension: 0.4
        },
        {
          label: 'Comments',
          data: comments,
          borderColor: '#f093fb',
          backgroundColor: 'rgba(240, 147, 251, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Engagement Metrics Over Time'
        }
      }
    }
  });
}

async function fetchPromoIndicators(videoId) {
  try {
    const response = await fetch(`${API_BASE_URL}/promo/indicators/${videoId}`);
    
    if (!response.ok) {
      console.log('No promo indicators available');
      return;
    }
    
    const indicators = await response.json();
    displayPromoIndicators(indicators);
  } catch (error) {
    console.error('Error fetching promo indicators:', error);
  }
}

function displayPromoIndicators(indicators) {
  const indicatorsList = document.getElementById('indicatorsList');
  
  if (indicators.length === 0) {
    indicatorsList.innerHTML = '<p>No promo indicators detected yet.</p>';
    return;
  }
  
  indicatorsList.innerHTML = indicators.map(indicator => `
    <div class="indicator-card">
      <h3>${indicator.indicator_type.replace(/_/g, ' ').toUpperCase()}</h3>
      <p><strong>Value:</strong> ${indicator.indicator_value ? indicator.indicator_value.toFixed(2) : 'N/A'}</p>
      <p><strong>Detected:</strong> ${new Date(indicator.detected_at).toLocaleString()}</p>
      ${indicator.notes ? `<p><strong>Notes:</strong> ${indicator.notes}</p>` : ''}
    </div>
  `).join('');
}
