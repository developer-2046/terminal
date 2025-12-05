"use client"

import { useState } from 'react';
import { Chart } from '../../components/chart';
import Link from 'next/link';
import { ArrowLeft, Play, Activity, DollarSign, TrendingUp, Settings } from 'lucide-react';

const STRATEGIES = [
    { id: 'sma_cross', name: 'SMA Crossover', params: { fast: 50, slow: 200 } },
    { id: 'ema_cross', name: 'EMA Crossover', params: { fast: 50, slow: 200 } },
    { id: 'rsi', name: 'RSI Strategy', params: { period: 14, lower: 30, upper: 70 } },
    { id: 'bollinger', name: 'Bollinger Bands', params: { period: 20, std_dev: 2.0 } },
    { id: 'macd', name: 'MACD', params: { fast: 12, slow: 26, signal: 9 } },
    { id: 'momentum', name: 'Momentum', params: { period: 10 } },
    { id: 'breakout', name: 'Donchian Breakout', params: { period: 20 } },
    { id: 'random', name: 'Random Walk (Baseline)', params: {} },
];

export default function BacktestPage() {
    const [symbol, setSymbol] = useState("SPY");
    const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].id);
    const [params, setParams] = useState<any>(STRATEGIES[0].params);
    const [initialCapital, setInitialCapital] = useState(100000);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const stratId = e.target.value;
        setSelectedStrategy(stratId);
        const strat = STRATEGIES.find(s => s.id === stratId);
        if (strat) {
            setParams(strat.params);
        }
    };

    const handleParamChange = (key: string, value: string) => {
        setParams(prev => ({
            ...prev,
            [key]: parseFloat(value)
        }));
    };

    const runBacktest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch('http://127.0.0.1:8000/api/backtest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol.toUpperCase(),
                    strategy: selectedStrategy,
                    params: params,
                    initial_capital: initialCapital
                })
            });

            const data = await res.json();
            if (res.ok) {
                setResult(data);
            } else {
                alert("Backtest Failed: " + data.detail);
            }
        } catch (err) {
            console.error(err);
            alert("Error running backtest");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-6 font-sans">
            <header className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
                <Link href="/" className="p-2 hover:bg-gray-800 rounded-full transition">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent font-mono">
                    STRATEGY BACKTESTER
                </h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-6 h-fit">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-purple-400" />
                        Configuration
                    </h2>

                    <form onSubmit={runBacktest} className="space-y-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Symbol</label>
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:border-purple-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Strategy</label>
                            <select
                                value={selectedStrategy}
                                onChange={handleStrategyChange}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:border-purple-500 outline-none"
                            >
                                {STRATEGIES.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Dynamic Params */}
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(params).map(([key, value]) => (
                                <div key={key}>
                                    <label className="block text-gray-400 text-sm mb-1 capitalize">{key.replace('_', ' ')}</label>
                                    <input
                                        type="number"
                                        value={value as number}
                                        onChange={(e) => handleParamChange(key, e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:border-purple-500 outline-none"
                                    />
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Initial Capital</label>
                            <input
                                type="number"
                                value={initialCapital}
                                onChange={(e) => setInitialCapital(parseFloat(e.target.value))}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:border-purple-500 outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 py-3 rounded font-bold transition flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" /> Run Backtest
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {result && (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                    <div className="text-gray-400 text-sm mb-1">Final Equity</div>
                                    <div className="text-2xl font-bold text-green-400">
                                        ${result.final_equity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                    <div className="text-gray-400 text-sm mb-1">Total Return</div>
                                    <div className={`text-2xl font-bold ${result.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {result.total_return.toFixed(2)}%
                                    </div>
                                </div>
                                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                    <div className="text-gray-400 text-sm mb-1">Sharpe Ratio</div>
                                    <div className="text-2xl font-bold text-blue-400">
                                        {result.sharpe_ratio.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-[500px]">
                                <h3 className="text-lg font-bold mb-4 text-gray-300">Equity Curve</h3>
                                <Chart
                                    data={result.equity_curve}
                                    colors={{
                                        lineColor: '#a855f7',
                                        areaTopColor: '#a855f7',
                                        areaBottomColor: 'rgba(168, 85, 247, 0.28)',
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {!result && !loading && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 border border-gray-800 border-dashed rounded-xl p-12">
                            <TrendingUp className="w-16 h-16 mb-4 opacity-50" />
                            <p>Configure and run a backtest to see results</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
