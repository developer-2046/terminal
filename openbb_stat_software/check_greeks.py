import yfinance as yf
import pandas as pd

ticker = yf.Ticker("SPY")
expirations = ticker.options
print(f"Expirations: {expirations[:3]}")

if expirations:
    opt = ticker.option_chain(expirations[0])
    print("\nCalls Columns:", opt.calls.columns.tolist())
    print("\nFirst Call Data:\n", opt.calls.iloc[0])
