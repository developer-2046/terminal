import logging
from .entropy_service import compute_market_entropy
from .sentiment_service import fetch_news
from .backtester_service import run_backtest
import yfinance as yf

def get_recommendation(symbol: str):
    try:
        # 1. Get Entropy (Market Regime)
        # We use SPY as the proxy for market regime
        entropy_data = compute_market_entropy()
        
        # FIX: Check structure of entropy_data.
        # Debug output shows: {'current_state': ..., 'current_entropy': ..., 'data': [{'Date': ..., 'Entropy': 2.22, ...}]}
        if isinstance(entropy_data, dict) and 'data' in entropy_data:
            latest = entropy_data['data'][-1]
        elif isinstance(entropy_data, list) and len(entropy_data) > 0:
            latest = entropy_data[-1]
        else:
            # Fallback if empty
            latest = {'Entropy': 3.5, 'Regime': 'Unknown'}

        # Use 'Entropy' key from debug output, fallback to 'value' just in case of older format
        current_entropy = latest.get('Entropy', latest.get('value', 3.5))
        regime = latest.get('Regime', latest.get('regime', 'Unknown'))
        
        # 2. Get Sentiment
        news = fetch_news(symbol)
        avg_sentiment = 0.5 # Default neutral
        if news:
            avg_sentiment = sum(n['sentiment_score'] for n in news) / len(news)
            
        # 3. Bayesian Estimation for Signal
        # Hypotheses: Bullish, Bearish, Neutral
        # Prior Probabilities (Assumed slightly bullish bias long term)
        p_bull = 0.4
        p_bear = 0.3
        p_neutral = 0.3
        
        # Evidence 1: Entropy (Market Stability)
        # Low Entropy (<3.8) favors Bullish/Neutral. High Entropy favors Bearish/Volatile.
        if current_entropy < 3.8:
            # Stable market
            p_bull *= 1.5
            p_neutral *= 1.2
            p_bear *= 0.5
        else:
            # Chaotic market
            p_bull *= 0.6
            p_neutral *= 0.8
            p_bear *= 1.4
            
        # Evidence 2: Sentiment (Stock Specific)
        # Positive (>0.6) favors Bullish. Negative (<0.4) favors Bearish.
        if avg_sentiment > 0.6:
            p_bull *= 1.6
            p_neutral *= 0.8
            p_bear *= 0.4
        elif avg_sentiment < 0.4:
            p_bull *= 0.4
            p_neutral *= 0.8
            p_bear *= 1.6
        else:
            p_bull *= 0.9
            p_neutral *= 1.3
            p_bear *= 0.9
            
        # Normalize
        total_p = p_bull + p_bear + p_neutral
        p_bull /= total_p
        p_bear /= total_p
        p_neutral /= total_p
        
        # Determine Signal
        signal = "HOLD"
        confidence = p_neutral
        
        if p_bull > 0.5:
            signal = "BUY" if p_bull < 0.75 else "STRONG BUY"
            confidence = p_bull
        elif p_bear > 0.5:
            signal = "SELL" if p_bear < 0.75 else "STRONG SELL"
            confidence = p_bear
            
        reasoning = []
        reasoning.append(f"Bayesian Probability: Bullish {p_bull:.2f}, Bearish {p_bear:.2f}, Neutral {p_neutral:.2f}")
        reasoning.append(f"Market Entropy ({current_entropy:.2f}) indicates {regime} regime.")
        reasoning.append(f"News Sentiment ({avg_sentiment:.2f}) adjusted the outlook.")

        # 4. Verify with Backtest
        backtest_result = run_backtest(symbol, "sma_cross", {"fast": 50, "slow": 200}, 100000)
        
        return {
            "symbol": symbol,
            "signal": signal,
            "confidence": confidence,
            "reasoning": reasoning,
            "factors": {
                "entropy": current_entropy,
                "regime": regime,
                "sentiment_score": avg_sentiment,
                "probabilities": {
                    "bullish": p_bull,
                    "bearish": p_bear,
                    "neutral": p_neutral
                }
            },
            "verification": backtest_result
        }
        
    except Exception as e:
        logging.error(f"Recommendation Error: {e}")
        return {
            "symbol": symbol,
            "signal": "ERROR",
            "confidence": 0,
            "reasoning": [str(e)],
            "factors": {},
            "verification": {}
        }
