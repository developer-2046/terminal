import json
import pandas as pd
import yfinance as yf
import tempfile
import os
import logging

# Try importing rust_core, handle failure gracefully
try:
    import rust_core as rc
except ImportError:
    rc = None
    logging.error("Could not import rust_core. Backtester will not work.")

def run_backtest(symbol: str, strategy_type: str, params: dict, initial_capital: float):
    if not rc:
        raise ImportError("rust_core module not found. Please ensure the backtester extension is built and installed.")

    # Fetch data
    ticker = yf.Ticker(symbol)
    # Fetch enough data for the slow period + simulation
    df = ticker.history(period="5y") 
    
    if df.empty:
        raise ValueError(f"No data found for {symbol}")
        
    # Prepare CSV for rust_core
    # Expected headers: ts, price, volume
    df.reset_index(inplace=True)
    
    # Identify Date column
    # yfinance usually returns 'Date' (date only) or 'Datetime' (timestamp)
    # We normalize column names to be safe
    df.columns = [c.capitalize() for c in df.columns]
    
    date_col = 'Date' if 'Date' in df.columns else 'Datetime'
    if date_col not in df.columns:
         # Fallback check
         for c in df.columns:
             if 'date' in c.lower():
                 date_col = c
                 break
    
    # Create the dataframe expected by rust_core
    df_ready = pd.DataFrame()
    df_ready['ts'] = df[date_col]
    df_ready['price'] = df['Close']
    df_ready['volume'] = df['Volume']
    
    # Ensure datetime and format as ISO 8601
    # rust_core expects DateTime<Utc>
    df_ready['ts'] = pd.to_datetime(df_ready['ts']).dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix=".csv", delete=False, newline='') as tmp:
        df_ready.to_csv(tmp.name, index=False)
        tmp_path = tmp.name
        
    try:
        # Config
        cfg = json.dumps({
            "strategy": strategy_type,
            "params": params,
            "initial_capital": float(initial_capital)
        })
        
        # Run backtest
        # rc.backtest returns a list of tuples/lists
        rows = rc.backtest(tmp_path, cfg)
        
        # Parse results
        # Assuming rows structure from README: [ts_ms, equity, sharpe]
        results = []
        for r in rows:
            results.append({
                "time": r[0] / 1000, # Convert ms to seconds for lightweight-charts
                "value": r[1],       # Equity
                "sharpe": r[2]
            })
            
        return {
            "symbol": symbol,
            "equity_curve": results,
            "final_equity": results[-1]['value'] if results else initial_capital,
            "total_return": ((results[-1]['value'] - initial_capital) / initial_capital) * 100 if results else 0,
            "sharpe_ratio": results[-1]['sharpe'] if results else 0
        }
        
    except Exception as e:
        logging.error(f"Backtest failed: {e}")
        raise e
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
