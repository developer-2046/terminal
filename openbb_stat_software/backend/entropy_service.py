import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

SECTORS = [
    "XLE", "XLF", "XLK", "XLV", "XLI", "XLY", "XLP", "XLU", "XLB", "XLRE", "XLC"
]

def get_market_data(period="2y", start=None, end=None):
    """Fetch close prices for sector ETFs."""
    if start:
        # yfinance expects YYYY-MM-DD string
        data = yf.download(SECTORS, start=start, end=end, progress=False)['Close']
    else:
        data = yf.download(SECTORS, period=period, progress=False)['Close']
    return data

def calculate_entropy(prob_vector):
    """Calculate Shannon entropy."""
    prob_vector = np.array(prob_vector)
    prob_vector = prob_vector[prob_vector > 0]
    return -np.sum(prob_vector * np.log2(prob_vector))

def compute_market_entropy(window=20, start_date=None, end_date=None):
    """
    Compute rolling entropy of the correlation matrix eigenvalues.
    """
    # Determine fetch range
    fetch_start = None
    fetch_end = end_date
    
    if start_date:
        # Add buffer for rolling window (approx 2 months to be safe for 20 trading days)
        # We need enough data BEFORE start_date to calculate the first window
        from datetime import timedelta
        s_dt = pd.to_datetime(start_date)
        fetch_start = (s_dt - timedelta(days=60)).strftime('%Y-%m-%d')
        
    df = get_market_data(start=fetch_start, end=fetch_end)
    
    # Calculate returns
    returns = df.pct_change().dropna()
    
    entropy_series = []
    dates = []
    
    # Rolling window
    for i in range(window, len(returns)):
        window_data = returns.iloc[i-window:i]
        
        # Correlation matrix
        corr_matrix = window_data.corr()
        
        # Eigenvalues
        eigvals = np.linalg.eigvalsh(corr_matrix)
        
        # Normalize eigenvalues to sum to 1 (probabilities)
        eigvals = np.abs(eigvals)
        eigvals = eigvals / np.sum(eigvals)
        
        # Entropy
        H = calculate_entropy(eigvals)
        
        entropy_series.append(H)
        dates.append(returns.index[i])
        
    results = pd.DataFrame({'Date': dates, 'Entropy': entropy_series})
    results.set_index('Date', inplace=True)
    
    # Determine Regimes using simple quantiles or KMeans
    X = results[['Entropy']].values
    kmeans = KMeans(n_clusters=3, random_state=42)
    results['Cluster'] = kmeans.fit_predict(X)
    
    # Map clusters to meaningful labels (Low, Med, High Entropy)
    cluster_means = results.groupby('Cluster')['Entropy'].mean().sort_values()
    
    mapping = {original: new for new, original in enumerate(cluster_means.index)}
    results['Regime_ID'] = results['Cluster'].map(mapping)
    
    regime_map = {0: "Low Entropy (Structured)", 1: "Neutral", 2: "High Entropy (Random/Noise)"}
    results['Regime'] = results['Regime_ID'].map(regime_map)
    
    # Filter by date if provided
    if start_date:
        results = results[results.index >= pd.to_datetime(start_date)]
    if end_date:
        results = results[results.index <= pd.to_datetime(end_date)]
    
    # Prepare for frontend
    results_reset = results.reset_index()
    results_reset['Date'] = results_reset['Date'].dt.strftime('%Y-%m-%d')
    
    if results.empty:
        return {
            "current_state": "Insufficient Data",
            "current_entropy": 0.0,
            "data": []
        }

    return {
        "current_state": results.iloc[-1]['Regime'],
        "current_entropy": float(results.iloc[-1]['Entropy']),
        "data": results_reset.to_dict(orient='records')
    }
