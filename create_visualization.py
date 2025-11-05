import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime

# Read the CSV data
df = pd.read_csv('micha-stocks-complete-data-2024-09-01-to-2025-11-05.csv')

# Filter only rows with YouTube views (Micha.Stocks posts)
df_with_views = df[df['youtube_views'].notna()].copy()

# Convert date column to datetime
df_with_views['date'] = pd.to_datetime(df_with_views['date'])

# Sort by date
df_with_views = df_with_views.sort_values('date').reset_index(drop=True)

# Calculate 7-day moving average of views
df_with_views['views_7day_ma'] = df_with_views['youtube_views'].rolling(window=7, min_periods=1).mean()

# Create dual-axis chart
fig, ax1 = plt.subplots(figsize=(16, 10))

# Plot 7-day MA views
color = 'tab:blue'
ax1.set_xlabel('Date', fontsize=12)
ax1.set_ylabel('7-Day Moving Average Views', color=color, fontsize=12)
line1 = ax1.plot(df_with_views['date'], df_with_views['views_7day_ma'], color=color, linewidth=2.5, label='7-Day MA Views')
ax1.tick_params(axis='y', labelcolor=color, labelsize=10)
ax1.grid(True, alpha=0.3)

# Create second y-axis for BTC price
ax2 = ax1.twinx()
color = 'tab:orange'
ax2.set_ylabel('BTC Price ($)', color=color, fontsize=12)
line2 = ax2.plot(df_with_views['date'], df_with_views['btc_price_close'], color=color, linewidth=2.5, label='BTC Price')
ax2.tick_params(axis='y', labelcolor=color, labelsize=10)

# Add title and format
plt.title('7-Day Moving Average Views vs BTC Price\n(Micha.Stocks YouTube Channel)', 
          fontsize=16, fontweight='bold', pad=20)

# Create combined legend
lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', fontsize=11)

# Format x-axis dates
plt.xticks(rotation=45, fontsize=10)
plt.tight_layout()

# Save the plot
plt.savefig('views_btc_correlation_chart.png', dpi=300, bbox_inches='tight', facecolor='white')
print("Chart saved as 'views_btc_correlation_chart.png'")
plt.show()

# Create correlation coefficient
correlation = df_with_views['views_7day_ma'].corr(df_with_views['btc_price_close'])
print(f"\nCorrelation between 7-day MA views and BTC price: {correlation:.3f}")

# Create summary statistics
print("\n=== SUMMARY STATISTICS ===")
print(f"Data period: {df_with_views['date'].min().strftime('%Y-%m-%d')} to {df_with_views['date'].max().strftime('%Y-%m-%d')}")
print(f"Total posts: {len(df_with_views)}")
print(f"Average 7-day MA views: {df_with_views['views_7day_ma'].mean():.0f}")
print(f"Average BTC price: ${df_with_views['btc_price_close'].mean():.2f}")
print(f"Max 7-day MA views: {df_with_views['views_7day_ma'].max():.0f}")
print(f"Min 7-day MA views: {df_with_views['views_7day_ma'].min():.0f}")
print(f"Max BTC price: ${df_with_views['btc_price_close'].max():.2f}")
print(f"Min BTC price: ${df_with_views['btc_price_close'].min():.2f}")