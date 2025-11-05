import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

print("=== CHANNEL ANALYSIS ===")

# Read the full CSV data
df = pd.read_csv('micha-stocks-complete-data-2024-09-01-to-2025-11-05.csv')

# Check unique channels
print("Unique channels in dataset:")
unique_channels = df['channel_name'].value_counts(dropna=False)
print(unique_channels)
print()

# Check if ciidb exists
ciidb_data = df[df['channel_name'].str.contains('ciidb', case=False, na=False)]
if len(ciidb_data) > 0:
    print(f"Found ciidb data: {len(ciidb_data)} rows")
    print("ciidb date range:", ciidb_data['date'].min(), "to", ciidb_data['date'].max())
else:
    print("No ciidb channel data found in this dataset")

# Check micha stocks data
micha_data = df[df['channel_name'].str.contains('Micha', case=False, na=False)]
print(f"Micha.Stocks data: {len(micha_data)} rows")
print("Micha.Stocks date range:", micha_data['date'].min(), "to", micha_data['date'].max())
print()

# Let's look at ALL data with YouTube views
all_view_data = df[df['youtube_views'].notna()].copy()
print("All data with YouTube views:")
print(f"Total rows: {len(all_view_data)}")
print("Channel breakdown:")
print(all_view_data['channel_name'].value_counts())
print()

if len(ciidb_data) > 0:
    # Analyze both channels if ciidb exists
    print("=== CORRELATION ANALYSIS BY CHANNEL ===")
    
    # Process Micha data
    micha_views = micha_data[micha_data['youtube_views'].notna()].copy()
    micha_views['date'] = pd.to_datetime(micha_views['date'])
    micha_views = micha_views.sort_values('date').reset_index(drop=True)
    micha_views['views_7day_ma'] = micha_views['youtube_views'].rolling(window=7, min_periods=1).mean()
    micha_correlation = micha_views['views_7day_ma'].corr(micha_views['btc_price_close'])
    
    # Process ciidb data
    ciidb_views = ciidb_data[ciidb_data['youtube_views'].notna()].copy()
    ciidb_views['date'] = pd.to_datetime(ciidb_views['date'])
    ciidb_views = ciidb_views.sort_values('date').reset_index(drop=True)
    ciidb_views['views_7day_ma'] = ciidb_views['youtube_views'].rolling(window=7, min_periods=1).mean()
    ciidb_correlation = ciidb_views['views_7day_ma'].corr(ciidb_views['btc_price_close'])
    
    print(f"Micha.Stocks correlation with BTC: {micha_correlation:.3f}")
    print(f"ciidb correlation with BTC: {ciidb_correlation:.3f}")
    print()
    
    if ciidb_correlation > micha_correlation:
        print(f"Better correlation: ciidb ({ciidb_correlation:.3f} vs {micha_correlation:.3f})")
    else:
        print(f"Better correlation: Micha.Stocks ({micha_correlation:.3f} vs {ciidb_correlation:.3f})")
else:
    print("=== ONLY MICHA.STOCKS DATA AVAILABLE ===")
    # Use existing analysis from Micha.Stocks
    micha_views = all_view_data.copy()
    micha_views['date'] = pd.to_datetime(micha_views['date'])
    micha_views = micha_views.sort_values('date').reset_index(drop=True)
    micha_views['views_7day_ma'] = micha_views['youtube_views'].rolling(window=7, min_periods=1).mean()
    micha_correlation = micha_views['views_7day_ma'].corr(micha_views['btc_price_close'])
    print(f"Micha.Stocks correlation with BTC: {micha_correlation:.3f}")

print("\n" + "="*50)
print("=== BUY/SELL SIGNAL ANALYSIS ===")

# Create buy/sell signals based on view patterns
# Method 1: View spikes when BTC is low (buy signal)
# Method 2: View drops when BTC is high (sell signal)

# Calculate BTC percentiles for low/high thresholds
btc_low_threshold = micha_views['btc_price_close'].quantile(0.25)
btc_high_threshold = micha_views['btc_price_close'].quantile(0.75)

# Calculate view percentiles
view_low_threshold = micha_views['youtube_views'].quantile(0.25)
view_high_threshold = micha_views['youtube_views'].quantile(0.75)

print(f"BTC Low Threshold (25th percentile): ${btc_low_threshold:,.2f}")
print(f"BTC High Threshold (75th percentile): ${btc_high_threshold:,.2f}")
print(f"View Low Threshold (25th percentile): {view_low_threshold:,.0f}")
print(f"View High Threshold (75th percentile): {view_high_threshold:,.0f}")
print()

# Signal 1: High views during BTC lows (potential buy signal)
buy_signals = micha_views[
    (micha_views['btc_price_close'] <= btc_low_threshold) & 
    (micha_views['youtube_views'] >= view_high_threshold)
].copy()

# Signal 2: Low views during BTC highs (potential sell signal)
sell_signals = micha_views[
    (micha_views['btc_price_close'] >= btc_high_threshold) & 
    (micha_views['youtube_views'] <= view_low_threshold)
].copy()

print("=== SIGNAL ANALYSIS RESULTS ===")
print(f"Potential BUY signals (High views + Low BTC): {len(buy_signals)}")
print(f"Potential SELL signals (Low views + High BTC): {len(sell_signals)}")
print()

if len(buy_signals) > 0:
    print("BUY SIGNALS (Date | Views | BTC Price):")
    for _, row in buy_signals.iterrows():
        print(f"{row['date'].strftime('%Y-%m-%d')} | {row['youtube_views']:,.0f} | ${row['btc_price_close']:,.2f}")
    print()

if len(sell_signals) > 0:
    print("SELL SIGNALS (Date | Views | BTC Price):")
    for _, row in sell_signals.iterrows():
        print(f"{row['date'].strftime('%Y-%m-%d')} | {row['youtube_views']:,.0f} | ${row['btc_price_close']:,.2f}")
    print()

# Advanced signal: Moving average crossovers
print("=== MOVING AVERAGE CROSSOVER SIGNALS ===")

# Calculate different moving averages
micha_views['views_3day_ma'] = micha_views['youtube_views'].rolling(window=3, min_periods=1).mean()
micha_views['views_14day_ma'] = micha_views['youtube_views'].rolling(window=14, min_periods=1).mean()
micha_views['views_30day_ma'] = micha_views['youtube_views'].rolling(window=30, min_periods=1).mean()

# Crossover signals
# Bullish: Short MA crosses above Long MA
micha_views['bullish_signal'] = (
    (micha_views['views_3day_ma'] > micha_views['views_14day_ma']) & 
    (micha_views['views_3day_ma'].shift(1) <= micha_views['views_14day_ma'].shift(1))
)

# Bearish: Short MA crosses below Long MA
micha_views['bearish_signal'] = (
    (micha_views['views_3day_ma'] < micha_views['views_14day_ma']) & 
    (micha_views['views_3day_ma'].shift(1) >= micha_views['views_14day_ma'].shift(1))
)

bullish_crossovers = micha_views[micha_views['bullish_signal']].copy()
bearish_crossovers = micha_views[micha_views['bearish_signal']].copy()

print(f"BULLISH crossovers (3-day MA > 14-day MA): {len(bullish_crossovers)}")
print(f"BEARISH crossovers (3-day MA < 14-day MA): {len(bearish_crossovers)}")
print()

# Let's also look at the reverse: BTC price changes causing view changes
print("=== BTC PRICE CHANGE vs VIEW CHANGE ANALYSIS ===")
micha_views['btc_change'] = micha_views['btc_price_close'].pct_change()
micha_views['view_change'] = micha_views['youtube_views'].pct_change()

# Find periods where large BTC drops coincided with view spikes (contrarian indicator)
large_drops = micha_views[micha_views['btc_change'] <= -0.05].copy()  # 5% drop
view_spikes = large_drops[large_drops['view_change'] >= 0.5]  # 50% view increase

print(f"Large BTC drops (>5%) with view spikes (>50%): {len(view_spikes)}")
if len(view_spikes) > 0:
    print("CONTRARIAN BUY signals (Big drops + Big view spikes):")
    for _, row in view_spikes.iterrows():
        btc_change_pct = row['btc_change'] * 100
        view_change_pct = row['view_change'] * 100
        print(f"{row['date'].strftime('%Y-%m-%d')} | BTC: {btc_change_pct:+.1f}% | Views: {view_change_pct:+.1f}%")

# Performance of signals
print("\n=== SIGNAL PERFORMANCE ANALYSIS ===")

if len(buy_signals) > 0:
    # Check performance 7 days after buy signals
    for _, signal in buy_signals.iterrows():
        signal_date = signal['date']
        signal_price = signal['btc_price_close']
        
        # Find 7 days later
        week_later = micha_views[micha_views['date'] >= signal_date + pd.Timedelta(days=7)]
        if len(week_later) > 0:
            week_return = (week_later['btc_price_close'].iloc[0] / signal_price - 1) * 100
            print(f"BUY {signal_date.strftime('%Y-%m-%d')}: BTC ${signal_price:,.2f} -> ${week_later['btc_price_close'].iloc[0]:,.2f} ({week_return:+.1f}%)")

print("\nSUMMARY:")
print(f"1. Channel correlation: Micha.Stocks shows {micha_correlation:.3f} correlation with BTC")
print(f"2. {len(buy_signals)} potential BUY signals identified")
print(f"3. {len(sell_signals)} potential SELL signals identified") 
print(f"4. {len(bullish_crossovers)} bullish crossovers, {len(bearish_crossovers)} bearish crossovers")
print(f"5. {len(view_spikes)} contrarian buy opportunities during panic selling")