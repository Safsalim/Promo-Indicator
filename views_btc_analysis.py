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

# Create a comprehensive analysis
print("=== 7-Day Moving Average Views vs BTC Price Analysis ===")
print(f"Data period: {df_with_views['date'].min()} to {df_with_views['date'].max()}")
print(f"Total posts analyzed: {len(df_with_views)}")
print()

# Display recent data with moving averages
print("Recent Posts with 7-Day Moving Average:")
print(df_with_views[['date', 'youtube_views', 'views_7day_ma', 'btc_price_close']].tail(15).to_string(index=False))
print()

# Calculate correlation between views and BTC price
# First, let's align the data by date for correlation
df_full = df.copy()
df_full['date'] = pd.to_datetime(df_full['date'])

# Forward fill BTC prices for days without posts to get daily BTC data
btc_daily = df_full[['date', 'btc_price_close']].drop_duplicates('date').sort_values('date')
btc_daily['btc_price_close'] = btc_daily['btc_price_close'].fillna(method='ffill')

# Merge with views data
df_merged = pd.merge(df_with_views[['date', 'youtube_views', 'views_7day_ma']], 
                     btc_daily, on='date', how='inner')

# Calculate correlation
views_btc_corr = df_merged['youtube_views'].corr(df_merged['btc_price_close'])
ma_btc_corr = df_merged['views_7day_ma'].corr(df_merged['btc_price_close'])

print(f"Correlation between daily views and BTC price: {views_btc_corr:.3f}")
print(f"Correlation between 7-day MA views and BTC price: {ma_btc_corr:.3f}")
print()

# Calculate some statistics
print("View Statistics:")
print(f"Average daily views: {df_with_views['youtube_views'].mean():.0f}")
print(f"Average 7-day MA views: {df_with_views['views_7day_ma'].mean():.0f}")
print(f"Max views (single day): {df_with_views['youtube_views'].max():.0f}")
print(f"Min views (single day): {df_with_views['youtube_views'].min():.0f}")
print()

print("BTC Price Statistics:")
print(f"Average BTC price: ${df_with_views['btc_price_close'].mean():.2f}")
print(f"Max BTC price: ${df_with_views['btc_price_close'].max():.2f}")
print(f"Min BTC price: ${df_with_views['btc_price_close'].min():.2f}")
print()

# Identify periods of high/low views and corresponding BTC prices
high_views_threshold = df_with_views['youtube_views'].quantile(0.8)
low_views_threshold = df_with_views['youtube_views'].quantile(0.2)

high_views_periods = df_with_views[df_with_views['youtube_views'] >= high_views_threshold]
low_views_periods = df_with_views[df_with_views['youtube_views'] <= low_views_threshold]

print("High Views Periods (Top 20%):")
print(f"Average BTC price during high views: ${high_views_periods['btc_price_close'].mean():.2f}")
print(f"Number of high view days: {len(high_views_periods)}")
print()

print("Low Views Periods (Bottom 20%):")
print(f"Average BTC price during low views: ${low_views_periods['btc_price_close'].mean():.2f}")
print(f"Number of low view days: {len(low_views_periods)}")
print()

# Monthly analysis
df_with_views['month'] = df_with_views['date'].dt.to_period('M')
monthly_stats = df_with_views.groupby('month').agg({
    'youtube_views': ['mean', 'count'],
    'btc_price_close': 'mean'
}).round(2)

monthly_stats.columns = ['Avg_Views', 'Post_Count', 'Avg_BTC_Price']
print("Monthly Summary:")
print(monthly_stats.tail(10))