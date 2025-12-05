"use client"

import { useState, useEffect } from 'react';
import { Chart } from '@/components/chart';
import { TradePanel } from '@/components/trade-panel';
import { AdvisorWidget } from '@/components/advisor-widget';
import { Watchlist } from '@/components/watchlist';
import { Activity, Wallet, TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [symbol, setSymbol] = useState("SPY");
  const [marketData, setMarketData] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>({ balance: 0, holdings: [] });
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/watchlist');
      const data = await res.json();
      if (data && data.length > 0) {
        setWatchlist(data);
        if (!symbol) setSymbol(data[0]);
      } else {
        setWatchlist(["SPY", "AAPL", "NVDA", "TSLA", "AMD"]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateWatchlist = async (newSymbols: string[]) => {
    setWatchlist(newSymbols);
    try {
      await fetch('http://127.0.0.1:8000/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: newSymbols })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/market-data/${symbol}`);
      const data = await res.json();
      setMarketData(data.data || []);
      // Clear simulations when changing stock/reloading
      setSimulations([]);
    } catch (e) {
      console.error(e);
      setMarketData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/portfolio');
      const data = await res.json();
      setPortfolio(data);
    } catch (e) {
      console.error(e);
    }
  };

  const runSimulation = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/simulate/gbm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, days: 30, simulations: 5 })
      });
      const data = await res.json();
      setSimulations(data.simulations);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWatchlist();
    fetchPortfolio();
  }, []);

  useEffect(() => {
    if (symbol) fetchData();
  }, [symbol]);

  const currentPrice = marketData?.length > 0 ? marketData[marketData.length - 1].close : 0;

  const exerciseOption = async (holdingId: number) => {
    if (!confirm("Are you sure you want to exercise this option?")) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/portfolio/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holding_id: holdingId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert(data.msg);
        fetchPortfolio();
      } else {
        alert("Error: " + (data.detail || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to exercise option");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent font-mono tracking-tighter">
          THE TERMINAL
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
            <Wallet size={18} className="text-green-400" />
            <span className="font-mono">${portfolio.balance?.toFixed(2)}</span>
          </div>
          <button onClick={fetchData} className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Watchlist */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-gray-800 pb-2">Quote Lookup</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('ticker') as HTMLInputElement;
              if (input.value) {
                window.location.href = `/stocks/${input.value.toUpperCase()}`;
              }
            }} className="flex gap-2">
              <input
                name="ticker"
                type="text"
                placeholder="Enter symbol (e.g. AMD)"
                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 uppercase"
              />
              <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 p-2 rounded text-white transition">
                &rarr;
              </button>
            </form>
          </div>

          <Watchlist
            symbols={watchlist}
            activeSymbol={symbol}
            onSelect={setSymbol}
            onUpdate={updateWatchlist}
          />

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-bold mb-4 border-b border-gray-800 pb-2">Current Holdings</h3>
            {!portfolio.holdings || portfolio.holdings.length === 0 ? (
              <div className="text-gray-500 text-center py-4 text-sm">No open positions</div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(portfolio.holdings) ? portfolio.holdings.map((h: any) => (
                  <div key={h.symbol + h.option_type + h.strike + h.expiration} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <Link href={`/stocks/${h.symbol}`} className="font-bold text-white hover:text-cyan-400 transition">
                        {h.display_name || h.symbol}
                      </Link>
                      <span className={`font-mono text-sm ${h.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {h.gain_loss >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{h.quantity} {h.asset_type === 'option' ? 'contracts' : 'shares'} @ ${h.avg_price.toFixed(2)}</span>
                      <span>Curr: ${h.current_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Value</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-white">${h.market_value.toFixed(2)}</span>
                        {h.asset_type === 'option' && (
                          <button
                            onClick={() => exerciseOption(h.id)}
                            className="text-[10px] bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded text-white transition"
                          >
                            Exercise
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  // Fallback for old format if API hasn't updated yet or cache issue
                  Object.entries(portfolio.holdings).map(([sym, qty]: [string, any]) => (
                    <li key={sym} className="flex justify-between items-center">
                      <span className="font-bold text-white">{sym}</span>
                      <span className="font-mono text-gray-400">{qty} shares</span>
                    </li>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Activity size={20} className="text-blue-400" /> {symbol} Price Action
              </h2>
              <button
                onClick={runSimulation}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition shadow-lg shadow-purple-900/20"
              >
                <TrendingUp size={16} /> Run GBM Simulation
              </button>
            </div>
            <div className="h-[400px] w-full relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              )}
              <Chart data={marketData} simulations={simulations} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 border-t border-gray-800 pt-4">
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider">Open</div>
                <div className="text-white font-mono font-medium">{marketData.length > 0 ? marketData[marketData.length - 1].open.toFixed(2) : '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider">High</div>
                <div className="text-white font-mono font-medium">{marketData.length > 0 ? marketData[marketData.length - 1].high.toFixed(2) : '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider">Low</div>
                <div className="text-white font-mono font-medium">{marketData.length > 0 ? marketData[marketData.length - 1].low.toFixed(2) : '-'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider">Vol</div>
                <div className="text-white font-mono font-medium">{marketData.length > 0 ? (marketData[marketData.length - 1].volume / 1e6).toFixed(2) + 'M' : '-'}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/entropy" className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-blue-500 transition group">
              <h2 className="text-xl font-bold mb-2 text-blue-400 group-hover:text-blue-300">Entropy Engine &rarr;</h2>
              <p className="text-gray-400 text-sm">Analyze market regime using Shannon Entropy.</p>
            </Link>
            <Link href="/options" className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-yellow-500 transition group">
              <h2 className="text-xl font-bold mb-2 text-yellow-400 group-hover:text-yellow-300">Options Chain &rarr;</h2>
              <p className="text-gray-400 text-sm">View real-time options data and Greeks.</p>
            </Link>
            <Link href="/backtest" className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-purple-500 transition group">
              <h2 className="text-xl font-bold mb-2 text-purple-400 group-hover:text-purple-300">Strategy Backtester &rarr;</h2>
              <p className="text-gray-400 text-sm">Test strategies with the Rust-powered engine.</p>
            </Link>
            <Link href="/sentiment" className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-pink-500 transition group">
              <h2 className="text-xl font-bold mb-2 text-pink-400 group-hover:text-pink-300">Sentiment Engine &rarr;</h2>
              <p className="text-gray-400 text-sm">AI-powered news analysis using LSTM.</p>
            </Link>
          </div>
        </div>

        {/* Right Sidebar: Trade */}
        <div className="lg:col-span-1 space-y-6">
          <TradePanel
            symbol={symbol}
            currentPrice={currentPrice}
            onTrade={fetchPortfolio}
          />

          <AdvisorWidget symbol={symbol} />
        </div>
      </div>
    </main>
  );
}
