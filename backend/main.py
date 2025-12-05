from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
import yfinance as yf
import logging
from sqlalchemy.orm import Session
from .database import init_db, get_db, Portfolio, Holding, Transaction, Watchlist

# Setup
app = FastAPI(title="The Terminal")
logging.basicConfig(level=logging.INFO)

# Initialize DB
init_db()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class TradeRequest(BaseModel):
    symbol: str
    action: str
    quantity: int
    price: float
    asset_type: str = "stock"
    option_type: str = None
    strike: float = None
    expiration: str = None

class SimulationRequest(BaseModel):
    symbol: str
    days: int = 30
    simulations: int = 5

class WatchlistRequest(BaseModel):
    symbols: list[str]

# --- Routes ---

@app.get("/")
def read_root():
    return {"status": "running", "msg": "The Terminal Backend"}

@app.get("/api/market-data/{symbol}")
def get_market_data(symbol: str):
    try:
        # Fetch historical data (last 1 year) using yfinance directly
        ticker = yf.Ticker(symbol)
        df = ticker.history(period="1y")
        
        if df.empty:
             raise HTTPException(status_code=404, detail="Symbol not found or no data")

        # Format for chart (time, open, high, low, close)
        # Reset index to get date as column
        df.reset_index(inplace=True)
        # Ensure column names are lowercase
        df.columns = [c.lower() for c in df.columns]
        
        # Handle Date column format (yfinance returns datetime)
        # Lightweight charts expects seconds or YYYY-MM-DD string
        df['date'] = df['date'].dt.strftime('%Y-%m-%d')
        
        data = df[['date', 'open', 'high', 'low', 'close', 'volume']].to_dict(orient='records')
        
        # Get stock info
        info = ticker.info
        stats = {
            "marketCap": info.get("marketCap"),
            "peRatio": info.get("trailingPE"),
            "dividendYield": info.get("dividendYield"),
            "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
            "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
            "volume": info.get("volume"),
            "avgVolume": info.get("averageVolume"),
            "shortName": info.get("shortName"),
            "longName": info.get("longName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "description": info.get("longBusinessSummary"),
            "currency": info.get("currency"),
            "currentPrice": info.get("currentPrice", df['close'].iloc[-1] if not df.empty else None),
            "open": info.get("open"),
            "dayHigh": info.get("dayHigh"),
            "dayLow": info.get("dayLow"),
        }
        
        return {"symbol": symbol, "data": data, "info": stats}
    except Exception as e:
        logging.error(f"Error fetching data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate/gbm")
def simulate_gbm(req: SimulationRequest):
    try:
        # Get recent data to calculate drift and volatility
        ticker = yf.Ticker(req.symbol)
        df = ticker.history(period="1y")
        prices = df['Close']
        
        # Calculate returns
        returns = prices.pct_change().dropna()
        mu = returns.mean()
        sigma = returns.std()
        
        last_price = prices.iloc[-1]
        dt = 1  # 1 day
        
        from datetime import datetime, timedelta
        
        simulations = []
        start_date = datetime.now()
        
        for _ in range(req.simulations):
            price_path = []
            current_price = last_price
            
            # Initial point (today)
            price_path.append({
                "time": start_date.strftime('%Y-%m-%d'),
                "value": float(current_price)
            })
            
            for i in range(1, req.days + 1):
                drift = (mu - 0.5 * sigma**2) * dt
                shock = sigma * np.sqrt(dt) * np.random.normal()
                current_price = current_price * np.exp(drift + shock)
                
                # Future date
                future_date = start_date + timedelta(days=i)
                
                price_path.append({
                    "time": future_date.strftime('%Y-%m-%d'),
                    "value": float(current_price)
                })
            simulations.append(price_path)
            
        return {"symbol": req.symbol, "simulations": simulations}
    except Exception as e:
        logging.error(f"GBM Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trade")
def execute_trade(trade: TradeRequest, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).first()
    if not portfolio:
        portfolio = Portfolio(balance=100000.0)
        db.add(portfolio)
        db.commit()
        
    cost = trade.quantity * trade.price
    
    if trade.action == "buy":
        if portfolio.balance >= cost:
            portfolio.balance -= cost
            
            # Check for existing holding
            query = db.query(Holding).filter(
                Holding.portfolio_id == portfolio.id, 
                Holding.symbol == trade.symbol,
                Holding.asset_type == trade.asset_type
            )
            
            if trade.asset_type == "option":
                query = query.filter(
                    Holding.option_type == trade.option_type,
                    Holding.strike == trade.strike,
                    Holding.expiration == trade.expiration
                )
                
            holding = query.first()
            
            if holding:
                # Calculate new avg price
                total_cost = (holding.quantity * holding.avg_price) + cost
                holding.quantity += trade.quantity
                holding.avg_price = total_cost / holding.quantity
            else:
                holding = Holding(
                    portfolio_id=portfolio.id, 
                    symbol=trade.symbol, 
                    quantity=trade.quantity, 
                    avg_price=trade.price,
                    asset_type=trade.asset_type,
                    option_type=trade.option_type,
                    strike=trade.strike,
                    expiration=trade.expiration
                )
                db.add(holding)
            
            # Record transaction
            txn = Transaction(
                symbol=trade.symbol, 
                action="buy", 
                quantity=trade.quantity, 
                price=trade.price,
                asset_type=trade.asset_type,
                option_type=trade.option_type,
                strike=trade.strike,
                expiration=trade.expiration
            )
            db.add(txn)
            
            db.commit()
            return {"status": "success", "balance": portfolio.balance}
        else:
            raise HTTPException(status_code=400, detail="Insufficient funds")
            
    elif trade.action == "sell":
        query = db.query(Holding).filter(
            Holding.portfolio_id == portfolio.id, 
            Holding.symbol == trade.symbol,
            Holding.asset_type == trade.asset_type
        )
        
        if trade.asset_type == "option":
            query = query.filter(
                Holding.option_type == trade.option_type,
                Holding.strike == trade.strike,
                Holding.expiration == trade.expiration
            )
            
        holding = query.first()
        
        if holding and holding.quantity >= trade.quantity:
            portfolio.balance += cost
            holding.quantity -= trade.quantity
            
            if holding.quantity == 0:
                db.delete(holding)
                
            # Record transaction
            txn = Transaction(
                symbol=trade.symbol, 
                action="sell", 
                quantity=trade.quantity, 
                price=trade.price,
                asset_type=trade.asset_type,
                option_type=trade.option_type,
                strike=trade.strike,
                expiration=trade.expiration
            )
            db.add(txn)
            
            db.commit()
            return {"status": "success", "balance": portfolio.balance}
        else:
            raise HTTPException(status_code=400, detail="Insufficient holdings")
            
    return {"status": "error", "msg": "Invalid action"}

class ExerciseRequest(BaseModel):
    holding_id: int

@app.post("/api/portfolio/exercise")
def exercise_option(req: ExerciseRequest, db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).first()
    holding = db.query(Holding).filter(Holding.id == req.holding_id).first()
    
    if not holding or holding.asset_type != "option":
        raise HTTPException(status_code=400, detail="Invalid holding")
        
    strike = holding.strike
    quantity = holding.quantity # Number of contracts
    shares_needed = quantity * 100
    cost = strike * shares_needed
    
    if holding.option_type == "call":
        # Buying shares at strike
        if portfolio.balance < cost:
            raise HTTPException(status_code=400, detail="Insufficient funds to exercise")
            
        portfolio.balance -= cost
        
        # Add shares
        existing_stock = db.query(Holding).filter(
            Holding.portfolio_id == portfolio.id, 
            Holding.symbol == holding.symbol,
            Holding.asset_type == "stock"
        ).first()
        
        if existing_stock:
            # Weighted average price update
            total_value = (existing_stock.quantity * existing_stock.avg_price) + cost
            existing_stock.quantity += shares_needed
            existing_stock.avg_price = total_value / existing_stock.quantity
        else:
            new_stock = Holding(
                portfolio_id=portfolio.id,
                symbol=holding.symbol,
                quantity=shares_needed,
                avg_price=strike,
                asset_type="stock"
            )
            db.add(new_stock)
            
    elif holding.option_type == "put":
        # Selling shares at strike
        existing_stock = db.query(Holding).filter(
            Holding.portfolio_id == portfolio.id, 
            Holding.symbol == holding.symbol,
            Holding.asset_type == "stock"
        ).first()
        
        if not existing_stock or existing_stock.quantity < shares_needed:
             raise HTTPException(status_code=400, detail="Insufficient shares to exercise put")
             
        portfolio.balance += cost
        existing_stock.quantity -= shares_needed
        if existing_stock.quantity == 0:
            db.delete(existing_stock)
            
    # Remove option holding
    db.delete(holding)
    
    # Record transaction (simplified)
    # db.add(Transaction(...)) 
    
    db.commit()
    return {"status": "success", "msg": f"Exercised {quantity} {holding.symbol} {holding.option_type}s"}

def get_occ_symbol(symbol, expiration, option_type, strike):
    """Construct OCC option symbol."""
    try:
        from datetime import datetime
        # Expiration: YYYY-MM-DD -> YYMMDD
        dt = datetime.strptime(expiration, "%Y-%m-%d")
        date_str = dt.strftime("%y%m%d")
        
        # Type: C or P
        type_str = "C" if option_type.lower() == "call" else "P"
        
        # Strike: * 1000, padded to 8 digits
        strike_int = int(strike * 1000)
        strike_str = f"{strike_int:08d}"
        
        return f"{symbol}{date_str}{type_str}{strike_str}"
    except:
        return None

@app.get("/api/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    portfolio = db.query(Portfolio).first()
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio.id).all()
    
    detailed_holdings = []
    total_value = portfolio.balance
    
    for h in holdings:
        current_price = 0.0
        display_name = h.symbol
        
        try:
            if h.asset_type == "option":
                # Construct OCC symbol for pricing
                occ_symbol = get_occ_symbol(h.symbol, h.expiration, h.option_type, h.strike)
                if occ_symbol:
                    ticker = yf.Ticker(occ_symbol)
                    current_price = ticker.fast_info.last_price
                    if not current_price or current_price == 0.0:
                         # Try history
                         hist = ticker.history(period="1d")
                         if not hist.empty:
                             current_price = hist['Close'].iloc[-1]
                
                # Fallback if fetch failed
                if not current_price:
                    current_price = h.avg_price
                    
                display_name = f"{h.symbol} {h.expiration} {h.strike} {h.option_type.title()}"
            else:
                # Stock
                ticker = yf.Ticker(h.symbol)
                current_price = ticker.fast_info.last_price
                if not current_price:
                     history = ticker.history(period="1d")
                     if not history.empty:
                         current_price = history['Close'].iloc[-1]
                     else:
                         current_price = h.avg_price
        except Exception as e:
            logging.error(f"Price fetch error for {h.symbol}: {e}")
            current_price = h.avg_price
            
        market_value = h.quantity * current_price
        # For options, quantity is contracts, but price is per share, so value is price * 100 * qty?
        # Usually option price is quoted per share.
        # If we bought at $170 (premium), that's likely the total contract cost or per share?
        # Standard: Price is per share. Contract is 100 shares.
        # Let's assume stored avg_price is per share.
        
        multiplier = 100 if h.asset_type == "option" else 1
        
        market_value = h.quantity * current_price * multiplier
        cost_basis = h.quantity * h.avg_price * multiplier
        
        gain_loss = market_value - cost_basis
        gain_loss_pct = (gain_loss / cost_basis) * 100 if cost_basis > 0 else 0
        
        total_value += market_value
        
        detailed_holdings.append({
            "id": h.id,
            "symbol": h.symbol,
            "display_name": display_name,
            "quantity": h.quantity,
            "avg_price": h.avg_price,
            "current_price": current_price,
            "market_value": market_value,
            "gain_loss": gain_loss,
            "gain_loss_pct": gain_loss_pct,
            "asset_type": h.asset_type,
            "option_type": h.option_type,
            "strike": h.strike,
            "expiration": h.expiration
        })
        
    # --- Performance Stats ---
    transactions = db.query(Transaction).order_by(Transaction.timestamp).all()
    
    realized_pnl = 0.0
    wins = 0
    losses = 0
    consecutive_losses = 0
    max_consecutive_losses = 0
    
    # FIFO Matching for Realized P&L
    # Map: symbol -> list of [quantity, price]
    inventory = {} 
    
    for t in transactions:
        sym = t.symbol
        if t.asset_type == "option":
            sym = f"{t.symbol}_{t.option_type}_{t.strike}_{t.expiration}"
            
        if t.action == "buy":
            if sym not in inventory: inventory[sym] = []
            inventory[sym].append([t.quantity, t.price])
        elif t.action == "sell":
            qty_to_sell = t.quantity
            while qty_to_sell > 0 and sym in inventory and inventory[sym]:
                # FIFO: Pop from front
                buy_qty, buy_price = inventory[sym][0]
                
                matched_qty = min(qty_to_sell, buy_qty)
                
                # Calculate P&L for this chunk
                pnl = (t.price - buy_price) * matched_qty
                realized_pnl += pnl
                
                if pnl > 0:
                    wins += 1
                    consecutive_losses = 0
                elif pnl < 0:
                    losses += 1
                    consecutive_losses += 1
                    max_consecutive_losses = max(max_consecutive_losses, consecutive_losses)
                
                # Update inventory
                if matched_qty == buy_qty:
                    inventory[sym].pop(0) # Fully sold this lot
                else:
                    inventory[sym][0][0] -= matched_qty # Partially sold
                    
                qty_to_sell -= matched_qty

    total_trades = wins + losses
    win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
    
    # --- Risk Metrics ---
    sector_exposure = {}
    asset_allocation = {"Stock": 0.0, "Option": 0.0, "Cash": portfolio.balance}
    
    for h in detailed_holdings:
        # Asset Allocation
        if h['asset_type'] == "option":
            asset_allocation["Option"] += h['market_value']
        else:
            asset_allocation["Stock"] += h['market_value']
            
        # Sector Exposure (Stocks only for now)
        if h['asset_type'] == "stock":
            try:
                # We might need to cache this to avoid slow API calls
                # For now, let's try to get it from info if available, or just use symbol
                # Ideally we'd store sector in DB or fetch in batch.
                # To keep it fast, let's assume we can get it from yfinance quickly or skip
                # Using fast_info doesn't give sector. 
                # Let's skip live sector fetch for speed and just group by symbol for now
                # Or try to fetch from yfinance info but catch errors
                pass 
            except:
                pass

    # Normalize Allocation
    total_assets = asset_allocation["Stock"] + asset_allocation["Option"] + asset_allocation["Cash"]
    allocation_pct = {k: (v / total_assets * 100) for k, v in asset_allocation.items()}

    return {
        "balance": portfolio.balance, 
        "total_value": total_value,
        "holdings": detailed_holdings,
        "stats": {
            "realized_pnl": realized_pnl,
            "win_rate": win_rate,
            "total_trades": total_trades,
            "max_consecutive_losses": max_consecutive_losses
        },
        "risk": {
            "allocation": allocation_pct
        }
    }

@app.get("/api/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    items = db.query(Watchlist).all()
    return [item.symbol for item in items]

@app.post("/api/watchlist")
def update_watchlist(req: WatchlistRequest, db: Session = Depends(get_db)):
    # Clear existing
    db.query(Watchlist).delete()
    # Add new
    for sym in req.symbols:
        db.add(Watchlist(symbol=sym))
    db.commit()
    return {"status": "success"}

@app.get("/api/entropy")
def get_entropy_analysis(start_date: str = None, end_date: str = None):
    try:
        from .entropy_service import compute_market_entropy
        data = compute_market_entropy(start_date=start_date, end_date=end_date)
        return data
    except Exception as e:
        logging.error(f"Entropy Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/options/{symbol}")
def get_options_chain(symbol: str, date: str = None):
    try:
        from .greeks import calculate_greeks
        
        ticker = yf.Ticker(symbol)
        expirations = ticker.options
        
        if not expirations:
            return {"symbol": symbol, "expirations": [], "calls": [], "puts": []}
            
        target_date = date if date in expirations else expirations[0]
        
        # Get current stock price
        current_price = ticker.history(period="1d")['Close'].iloc[-1]
        
        # Risk free rate (approx 4.5%)
        r = 0.045
        
        # Calculate time to expiration in years
        # Calculate time to expiration in years
        from datetime import datetime, timedelta
        exp_dt = datetime.strptime(target_date, "%Y-%m-%d")
        # Set expiration to market close (16:00)
        exp_dt = exp_dt.replace(hour=16, minute=0, second=0)
        
        today = datetime.now()
        
        # Calculate difference in years
        diff = exp_dt - today
        T = diff.total_seconds() / (365 * 24 * 3600)
        
        if T < 0.0001: T = 0.0001 # Avoid zero division for expired/expiring
        
        opt = ticker.option_chain(target_date)
        
        # Process Calls
        calls = []
        for _, row in opt.calls.fillna(0).iterrows():
            d = row.to_dict()
            # Calculate Greeks
            iv = d.get('impliedVolatility', 0)
            if iv > 0:
                greeks = calculate_greeks(current_price, d['strike'], T, r, iv, "call")
                d.update(greeks)
            calls.append(d)

        # Process Puts
        puts = []
        for _, row in opt.puts.fillna(0).iterrows():
            d = row.to_dict()
            # Calculate Greeks
            iv = d.get('impliedVolatility', 0)
            if iv > 0:
                greeks = calculate_greeks(current_price, d['strike'], T, r, iv, "put")
                d.update(greeks)
            puts.append(d)
        
        return {
            "symbol": symbol,
            "expirations": expirations,
            "selected_date": target_date,
            "current_price": current_price,
            "calls": calls,
            "puts": puts
        }
    except Exception as e:
        logging.error(f"Options Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class BacktestRequest(BaseModel):
    symbol: str
    strategy: str = "sma_cross"
    params: dict = {"fast": 50, "slow": 200}
    initial_capital: float = 100000.0

@app.post("/api/backtest")
def run_backtest_endpoint(req: BacktestRequest):
    try:
        from .backtester_service import run_backtest
        result = run_backtest(req.symbol, req.strategy, req.params, req.initial_capital)
        return result
    except Exception as e:
        logging.error(f"Backtest Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sentiment/{symbol}")
def get_sentiment(symbol: str):
    try:
        from .sentiment_service import fetch_news
        news = fetch_news(symbol)
        
        # Calculate average sentiment
        avg_score = 0
        if news:
            avg_score = sum(n['sentiment_score'] for n in news) / len(news)
            
        overall_label = "Neutral"
        if avg_score > 0.6: overall_label = "Positive"
        elif avg_score < 0.4: overall_label = "Negative"
            
        return {
            "symbol": symbol,
            "overall_sentiment": overall_label,
            "average_score": avg_score,
            "news": news
        }
    except Exception as e:
        logging.error(f"Sentiment Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/recommendation/{symbol}")
def get_recommendation_endpoint(symbol: str):
    try:
        from .recommendation_service import get_recommendation
        result = get_recommendation(symbol)
        return result
    except Exception as e:
        logging.error(f"Recommendation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

