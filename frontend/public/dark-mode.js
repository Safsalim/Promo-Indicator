const THEME_KEY = 'theme-preference';

const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = document.getElementById('darkModeIcon');
const darkModeText = document.getElementById('darkModeText');

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY);
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  if (theme === 'dark') {
    darkModeIcon.textContent = '☀️';
    darkModeText.textContent = 'Light Mode';
  } else {
    darkModeIcon.textContent = '🌙';
    darkModeText.textContent = 'Dark Mode';
  }
  
  updateChartsForTheme(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  saveTheme(newTheme);
}

function updateChartsForTheme(theme) {
  if (typeof fetchMetrics === 'function' && typeof currentMetrics !== 'undefined' && currentMetrics && currentMetrics.length > 0) {
    fetchMetrics();
  }
  if (typeof renderOverlayChart === 'function' && currentViewMode === 'overlay') {
    renderOverlayChart();
  }
}

function initTheme() {
  const savedTheme = getSavedTheme();
  const theme = savedTheme || getSystemTheme();
  applyTheme(theme);
}

darkModeToggle.addEventListener('click', toggleTheme);

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!getSavedTheme()) {
    applyTheme(e.matches ? 'dark' : 'light');
  }
});

initTheme();
