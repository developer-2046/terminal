# 🚀 The Terminal

**The Terminal** is an advanced, AI-powered financial analytics platform designed for sophisticated market analysis. It integrates state-of-the-art quantitative engines, machine learning models, and high-performance backtesting to provide actionable investment insights.

![Dashboard Screenshot](frontend/public/dashboard-preview.png)

## 🌟 Key Features

### 1. 🧠 Market Entropy Engine
*   **Concept**: Uses **Shannon Entropy** to measure the amount of "disorder" or "chaos" in the market based on the correlation matrix of sector ETFs.
*   **Logic**:
    *   **Low Entropy (< 3.0)**: High correlation between sectors. Indicates a stable, unified market regime (often Bullish).
    *   **High Entropy (> 4.5)**: Low correlation. Indicates a fragmented, volatile, or transitioning market (Chaos/Bearish).
*   **Tech**: Python (`numpy`, `pandas`, `scipy`), Rolling Window Correlation.

### 2. ⚡ Rust-Powered Backtester
*   **Performance**: Built with **Rust** (`pyo3`) for lightning-fast simulation of trading strategies over years of minute-level data.
*   **Capabilities**:
    *   Supports custom strategies (e.g., SMA Crossover, RSI).
    *   Calculates Equity Curves, Sharpe Ratios, Max Drawdown, and Total Return.
*   **Integration**: Python wrapper calls the compiled Rust binary for seamless usage in the backend.

### 3. 🤖 Sentiment Engine (LSTM)
*   **AI Model**: Uses a **Long Short-Term Memory (LSTM)** neural network (built with **PyTorch**) to analyze financial news headlines and summaries.
*   **Data Source**: Real-time news fetching via `yfinance`.
*   **Output**:
    *   **Sentiment Score (0-100)**: Quantifies the positivity/negativity of the news coverage.
    *   **Classification**: Positive, Negative, or Neutral badges for each article.

### 4. 🔮 Bayesian Recommendation Engine
*   **Synthesis**: Combines signals from the Entropy Engine and Sentiment Engine using **Bayesian Estimation**.
*   **Logic**:
    *   Starts with a prior probability (e.g., slightly bullish bias).
    *   **Updates Beliefs**:
        *   *Evidence A (Entropy)*: If market is stable, increase Bullish probability.
        *   *Evidence B (Sentiment)*: If news is positive, further increase Bullish probability.
*   **Verification**: Automatically runs a backtest on the generated signal to validate its historical performance before showing it to the user.

### 5. 📉 Options Chain & Greeks
*   **Real-time Data**: Fetches full option chains for any ticker.
*   **Greeks Calculation**: Computes Delta, Gamma, Theta, Vega, and Rho using the **Black-Scholes model**.
*   **0DTE Support**: Specialized handling for Zero Days to Expiration options to ensure accurate Greek calculation near market close.

### 6. 💼 Portfolio Management
*   **Paper Trading**: Full portfolio tracking with Buy/Sell capabilities.
*   **Option Exercise**: Ability to exercise option contracts, converting them to underlying shares or cash adjustments.
*   **GBM Simulation**: Run Geometric Brownian Motion simulations to forecast potential future price paths.

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js 14 (React), TypeScript, Tailwind CSS, Lightweight Charts.
*   **Backend**: Python (FastAPI), SQLAlchemy (SQLite), PyTorch (AI), NumPy/Pandas (Quant).
*   **Core Engine**: Rust (for high-performance backtesting).
*   **Data**: `yfinance` (Yahoo Finance API).

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.10+
*   Node.js 18+
*   Rust (Cargo)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/the-terminal.git
cd the-terminal
```

### 2. Backend Setup
The backend handles data fetching, AI inference, and the database.

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install PyTorch (CPU version is fine for inference)
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Build the Rust Backtester Extension
cd rust_core
maturin develop --release
cd ..

# Run the Server
python3 -m uvicorn main:app --reload
```
*The backend will start at `http://localhost:8000`*

### 3. Frontend Setup
The frontend is a modern Next.js dashboard.

```bash
cd frontend

# Install dependencies
npm install

# Run the Development Server
npm run dev
```
*The frontend will start at `http://localhost:3000`*

---

## 📖 Usage Guide

1.  **Dashboard**: The main hub. View your watchlist, portfolio, and the "AI Advisor" widget.
2.  **Trade**: Use the right sidebar to Buy/Sell stocks.
3.  **Analysis**:
    *   **Entropy**: Click "Entropy Engine" to see the market regime chart.
    *   **Sentiment**: Click "Sentiment Engine" to search for a stock and see news analysis.
    *   **Advisor**: Click "View Full Analysis" on the widget to see the Bayesian breakdown and backtest verification.
4.  **Options**: Go to "Options Chain" to view Greeks and analyze contracts.

---

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/)
