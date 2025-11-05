import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import yfinance as yf
from datetime import datetime, timedelta

print("Fetching S&P 500 data...")

# Define the date range for S&P 500 data
start_date = "2024-09-01"
end_date = "2025-11-05"

# Fetch S&P 500 data (^GSPC is the ticker for S&P 500)
sp500 = yf.download("^GSPC", start=start_date, end=end_date, progress=False)
sp500.reset_index(inplace=True)

# Handle multi-level columns if they exist
if isinstance(sp500.columns, pd.MultiIndex):
    sp500.columns = sp500.columns.droplevel(0)

# Print columns to debug
print(f"S&P 500 columns: {sp500.columns.tolist()}")

# Find the date column (it might be named differently)
date_col = None
for col in sp500.columns:
    if 'date' in col.lower() or col in ['Date', 'date', 'Datetime', 'datetime']:
        date_col = col
        break

if date_col is None:
    date_col = sp500.columns[0]  # Use first column as date

sp500['Date'] = sp500[date_col].dt.tz_localize(None)  # Remove timezone info if present
sp500['date'] = pd.to_datetime(sp500['Date']).dt.date

# Find the close price column (try different variations)
close_col = None
for col in sp500.columns:
    if 'close' in col.lower() or 'adj close' in col.lower():
        close_col = col
        break

if close_col is None:
    close_col = sp500.columns[1]  # Use second column as close price

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

# Merge with S&P 500 data
df_with_views['date_only'] = df_with_views['date'].dt.date
sp500_subset = sp500[['date', close_col]].rename(columns={close_col: 'sp500_close'})
df_combined = pd.merge(df_with_views, sp500_subset, left_on='date_only', right_on='date', how='left')

# Forward fill S&P 500 data for missing dates
df_combined['sp500_close'] = df_combined['sp500_close'].ffill()

print("S&P 500 data loaded successfully!")

# Calculate correlations
btc_correlation = df_combined['views_7day_ma'].corr(df_combined['btc_price_close'])
sp500_correlation = df_combined['views_7day_ma'].corr(df_combined['sp500_close'])

print(f"\n=== CORRELATION ANALYSIS ===")
print(f"7-day MA Views vs BTC Price: {btc_correlation:.3f}")
print(f"7-day MA Views vs S&P 500 Price: {sp500_correlation:.3f}")

# Create comprehensive visualization
fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(16, 15))

# Plot 1: Views vs BTC
ax1_twin = ax1.twinx()
line1 = ax1.plot(df_combined['date'], df_combined['views_7day_ma'], 'b-', linewidth=2, label='7-Day MA Views')
line2 = ax1_twin.plot(df_combined['date'], df_combined['btc_price_close'], 'orange', linewidth=2, label='BTC Price')
ax1.set_ylabel('7-Day MA Views', color='b', fontsize=12)
ax1_twin.set_ylabel('BTC Price ($)', color='orange', fontsize=12)
ax1.set_title('YouTube Views vs BTC Price\nCorrelation: ' + f"{btc_correlation:.3f}", fontsize=14, fontweight='bold')
ax1.grid(True, alpha=0.3)
lines1, labels1 = ax1.get_legend_handles_labels()
lines2, labels2 = ax1_twin.get_legend_handles_labels()
ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left')

# Plot 2: Views vs S&P 500
ax2_twin = ax2.twinx()
line3 = ax2.plot(df_combined['date'], df_combined['views_7day_ma'], 'b-', linewidth=2, label='7-Day MA Views')
line4 = ax2_twin.plot(df_combined['date'], df_combined['sp500_close'], 'green', linewidth=2, label='S&P 500 Price')
ax2.set_ylabel('7-Day MA Views', color='b', fontsize=12)
ax2_twin.set_ylabel('S&P 500 Price ($)', color='green', fontsize=12)
ax2.set_title('YouTube Views vs S&P 500 Price\nCorrelation: ' + f"{sp500_correlation:.3f}", fontsize=14, fontweight='bold')
ax2.grid(True, alpha=0.3)
lines3, labels3 = ax2.get_legend_handles_labels()
lines4, labels4 = ax2_twin.get_legend_handles_labels()
ax2.legend(lines3 + lines4, labels3 + labels4, loc='upper left')

# Plot 3: BTC vs S&P 500 comparison
ax3_twin = ax3.twinx()
line5 = ax3.plot(df_combined['date'], df_combined['btc_price_close'], 'orange', linewidth=2, label='BTC Price')
line6 = ax3_twin.plot(df_combined['date'], df_combined['sp500_close'], 'green', linewidth=2, label='S&P 500 Price')
ax3.set_ylabel('BTC Price ($)', color='orange', fontsize=12)
ax3_twin.set_ylabel('S&P 500 Price ($)', color='green', fontsize=12)
ax3.set_xlabel('Date', fontsize=12)
ax3.set_title('BTC Price vs S&P 500 Price Comparison', fontsize=14, fontweight='bold')
ax3.grid(True, alpha=0.3)
lines5, labels5 = ax3.get_legend_handles_labels()
lines6, labels6 = ax3_twin.get_legend_handles_labels()
ax3.legend(lines5 + lines6, labels5 + labels6, loc='upper left')

plt.suptitle('Micha.Stocks YouTube Views vs Market Performance\n(September 2024 - November 2025)', 
             fontsize=16, fontweight='bold', y=0.98)
plt.tight_layout()
plt.subplots_adjust(top=0.94)

# Save the plot
plt.savefig('views_btc_sp500_comprehensive_analysis.png', dpi=300, bbox_inches='tight', facecolor='white')
print("\nComprehensive chart saved as 'views_btc_sp500_comprehensive_analysis.png'")
plt.show()

# Detailed analysis
print("\n=== COMPREHENSIVE MARKET ANALYSIS ===")
print(f"Data period: {df_combined['date'].min().strftime('%Y-%m-%d')} to {df_combined['date'].max().strftime('%Y-%m-%d')}")
print(f"Total posts analyzed: {len(df_combined)}")

# Market performance comparison
btc_return = ((df_combined['btc_price_close'].iloc[-1] / df_combined['btc_price_close'].iloc[0]) - 1) * 100
sp500_return = ((df_combined['sp500_close'].iloc[-1] / df_combined['sp500_close'].iloc[0]) - 1) * 100

print(f"\nMarket Performance:")
print(f"BTC return: {btc_return:.1f}%")
print(f"S&P 500 return: {sp500_return:.1f}%")

# Volatility analysis
btc_volatility = df_combined['btc_price_close'].pct_change().std() * np.sqrt(252) * 100
sp500_volatility = df_combined['sp500_close'].pct_change().std() * np.sqrt(252) * 100
views_volatility = df_combined['youtube_views'].pct_change().std() * np.sqrt(252) * 100

print(f"\nAnnualized Volatility:")
print(f"BTC: {btc_volatility:.1f}%")
print(f"S&P 500: {sp500_volatility:.1f}%")
print(f"YouTube Views: {views_volatility:.1f}%")

# Quarterly correlation analysis
quarters = [
    ('2024-09-01', '2024-12-31', 'Q4 2024'),
    ('2025-01-01', '2025-03-31', 'Q1 2025'),
    ('2025-04-01', '2025-06-30', 'Q2 2025'),
    ('2025-07-01', '2025-09-30', 'Q3 2025'),
    ('2025-10-01', '2025-11-05', 'Q4 2025 (Partial)')
]

print(f"\n=== QUARTERLY CORRELATIONS ===")
print(f"{'Period':<20} {'Views vs BTC':<12} {'Views vs S&P500':<15}")
print("-" * 50)
for start, end, label in quarters:
    mask = (df_combined['date'] >= start) & (df_combined['date'] <= end)
    period_data = df_combined[mask]
    if len(period_data) > 5:
        btc_corr = period_data['views_7day_ma'].corr(period_data['btc_price_close'])
        sp500_corr = period_data['views_7day_ma'].corr(period_data['sp500_close'])
        print(f"{label:<20} {btc_corr:>8.3f}      {sp500_corr:>8.3f}")

# Key insights
print(f"\n=== KEY INSIGHTS ===")
if abs(btc_correlation) > abs(sp500_correlation):
    stronger = "BTC"
    stronger_corr = btc_correlation
else:
    stronger = "S&P 500"
    stronger_corr = sp500_correlation

print(f"1. STRONGER CORRELATION: {stronger} has stronger correlation ({stronger_corr:.3f}) with views than the other")
print(f"2. CORRELATION DIFFERENCE: {abs(btc_correlation - sp500_correlation):.3f}")
print(f"3. BTC VOLATILITY: BTC is {btc_volatility/sp500_volatility:.1f}x more volatile than S&P 500")
print(f"4. MARKET PERFORMANCE: BTC outperformed S&P 500 by {btc_return - sp500_return:.1f}%")

if btc_correlation > 0 and sp500_correlation > 0:
    print("5. POSITIVE CORRELATION: Both markets show positive correlation with views")
elif btc_correlation < 0 and sp500_correlation < 0:
    print("5. NEGATIVE CORRELATION: Both markets show negative correlation with views")
else:
    print("5. MIXED CORRELATION: Markets show different correlation patterns with views")