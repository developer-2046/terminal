"use client"

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Brain, TrendingUp, TrendingDown, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { createChart, ColorType } from 'lightweight-charts';
import { useRef } from 'react';

export default function AdvisorPage() {
    const params = useParams();
    const symbol = typeof params.symbol === 'string' ? params.symbol : '';
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchAdvice = async () => {
            if (!symbol) return;
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/recommendation/${symbol}`);
                const result = await res.json();
                setData(result);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchAdvice();
    }, [symbol]);

    // Chart Effect
    useEffect(() => {
        if (!data || !data.verification || !data.verification.equity_curve || !chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: 'white',
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            grid: {
                vertLines: { color: '#333' },
                horzLines: { color: '#333' },
            },
        });

        const lineSeries = chart.addLineSeries({
            color: '#8b5cf6', // Purple
            lineWidth: 2,
        });

        // Format data for chart
        const chartData = data.verification.equity_curve.map((item: any) => ({
            // Backend returns unix timestamp in seconds, lightweight-charts handles this
            // But for daily data, we might want to ensure it's treated correctly.
            // Let's convert to YYYY-MM-DD for consistency if it's daily data, 
            // or just use the timestamp. Using timestamp is safer.
            time: item.time,
            value: item.value
        }));

        lineSeries.setData(chartData);
        chart.timeScale().fitContent();

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data]);

    const getSignalColor = (signal: string) => {
        if (signal?.includes('BUY')) return 'text-green-400';
        if (signal?.includes('SELL')) return 'text-red-400';
        return 'text-yellow-400';
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </main>
        );
    }

    if (!data) return null;

    return (
        <main className="min-h-screen bg-black text-white p-6 font-sans">
            <header className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
                <Link href="/" className="p-2 hover:bg-gray-800 rounded-full transition">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent font-mono tracking-tighter">
                    AI INVESTMENT ADVISOR
                </h1>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Recommendation */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                        <div className="text-gray-500 text-sm uppercase tracking-wider mb-2">Recommendation for {symbol}</div>
                        <div className={`text-5xl font-black font-mono tracking-tight mb-4 ${getSignalColor(data.signal)}`}>
                            {data.signal}
                        </div>

                        <div className="flex justify-center items-center gap-2 mb-6">
                            <span className="text-gray-400">Confidence Score:</span>
                            <div className="bg-gray-800 px-3 py-1 rounded-full font-mono font-bold text-white border border-gray-700">
                                {(data.confidence * 100).toFixed(0)}%
                            </div>
                        </div>

                        <div className="text-left bg-black/30 p-4 rounded-xl border border-gray-800">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                <Brain size={16} className="text-purple-400" /> AI Reasoning
                            </h4>
                            <ul className="space-y-2">
                                {data.reasoning.map((r: string, idx: number) => (
                                    <li key={idx} className="text-gray-400 text-sm flex items-start gap-2">
                                        <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                        <h3 className="text-lg font-bold mb-4 text-white">Key Factors</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Activity size={18} className="text-blue-400" />
                                    <span className="text-gray-400">Entropy (Regime)</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold">{data.factors.entropy.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">{data.factors.regime}</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {data.factors.sentiment_score > 0.5 ? <TrendingUp size={18} className="text-green-400" /> : <TrendingDown size={18} className="text-red-400" />}
                                    <span className="text-gray-400">Sentiment Score</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold">{(data.factors.sentiment_score * 100).toFixed(1)}</div>
                                    <div className="text-xs text-gray-500">{data.factors.sentiment_score > 0.6 ? 'Positive' : data.factors.sentiment_score < 0.4 ? 'Negative' : 'Neutral'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Verification */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <ShieldCheck size={24} className="text-green-400" /> Verification Backtest
                                </h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    Performance of this strategy over the last 6 months.
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500 uppercase">Total Return</div>
                                <div className={`text-2xl font-mono font-bold ${data.verification.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {data.verification.total_return >= 0 ? '+' : ''}{data.verification.total_return?.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        <div ref={chartContainerRef} className="w-full h-[300px] mb-6 border border-gray-800 rounded-lg bg-black/20" />

                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-black/30 p-4 rounded-lg border border-gray-800 text-center">
                                <div className="text-gray-500 text-xs uppercase mb-1">Sharpe Ratio</div>
                                <div className="font-mono font-bold text-lg">{data.verification.sharpe_ratio?.toFixed(2)}</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-lg border border-gray-800 text-center">
                                <div className="text-gray-500 text-xs uppercase mb-1">Max Drawdown</div>
                                <div className="font-mono font-bold text-lg text-red-400">{data.verification.max_drawdown?.toFixed(2)}%</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-lg border border-gray-800 text-center">
                                <div className="text-gray-500 text-xs uppercase mb-1">Trades</div>
                                <div className="font-mono font-bold text-lg">{data.verification.trades}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle size={24} className="text-yellow-500 shrink-0 mt-1" />
                        <div>
                            <h4 className="font-bold text-yellow-500">Disclaimer</h4>
                            <p className="text-yellow-200/70 text-sm mt-1">
                                This analysis is generated by AI algorithms based on historical data and news sentiment.
                                It does not constitute financial advice. Past performance is not indicative of future results.
                                Always do your own research before investing.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
