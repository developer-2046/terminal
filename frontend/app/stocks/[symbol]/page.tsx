"use client";

import { useEffect, useState, use } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';

export default function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
    const { symbol } = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/market-data/${symbol}`);
                if (!res.ok) throw new Error("Failed to fetch data");
                const json = await res.json();
                setData(json);
            } catch (e) {
                setError("Could not load stock data");
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [symbol]);

    useEffect(() => {
        if (data && data.data) {
            const chartContainer = document.getElementById('stock-chart');
            if (chartContainer) {
                chartContainer.innerHTML = '';
                const chart = createChart(chartContainer, {
                    layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#DDD' },
                    grid: { vertLines: { color: '#333' }, horzLines: { color: '#333' } },
                    width: chartContainer.clientWidth,
                    height: 400,
                });

                const areaSeries = chart.addAreaSeries({
                    lineColor: '#22d3ee',
                    topColor: 'rgba(34, 211, 238, 0.4)',
                    bottomColor: 'rgba(34, 211, 238, 0.0)',
                });

                const chartData = data.data.map((d: any) => ({
                    time: d.date,
                    value: d.close
                }));

                areaSeries.setData(chartData);
                chart.timeScale().fitContent();
            }
        }
    }, [data]);

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
    if (error) return <div className="min-h-screen bg-black text-white flex items-center justify-center text-red-500">{error}</div>;

    const info = data?.info || {};
    const currentPrice = info.currentPrice || data.data[data.data.length - 1].close;
    const prevClose = data.data.length > 1 ? data.data[data.data.length - 2].close : currentPrice;
    const change = currentPrice - prevClose;
    const changePct = (change / prevClose) * 100;
    const isPositive = change >= 0;

    return (
        <main className="min-h-screen bg-black text-white p-6 font-sans">
            {/* Header */}
            <header className="flex items-center gap-4 mb-8">
                <Link href="/" className="p-2 hover:bg-gray-800 rounded-full transition">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">{info.shortName || symbol}</h1>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-mono font-bold">${currentPrice.toFixed(2)}</span>
                        <span className={`flex items-center gap-1 text-lg font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            {change > 0 ? '+' : ''}{change.toFixed(2)} ({changePct.toFixed(2)}%)
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{info.exchange} • {info.currency}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div id="stock-chart" className="w-full h-[400px]"></div>
                </div>

                {/* Stats Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-cyan-400" />
                            Key Statistics
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <StatItem label="Market Cap" value={formatLargeNumber(info.marketCap)} />
                            <StatItem label="P/E Ratio" value={info.peRatio?.toFixed(2)} />
                            <StatItem label="Div Yield" value={info.dividendYield ? `${(info.dividendYield * 100).toFixed(2)}%` : '-'} />
                            <StatItem label="52W High" value={info.fiftyTwoWeekHigh?.toFixed(2)} />
                            <StatItem label="52W Low" value={info.fiftyTwoWeekLow?.toFixed(2)} />
                            <StatItem label="Volume" value={formatLargeNumber(info.volume)} />
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4">About</h2>
                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-6">
                            {info.description || "No description available."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">{info.sector}</span>
                            <span className="px-3 py-1 bg-gray-800 rounded-full text-xs text-gray-300">{info.industry}</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

function StatItem({ label, value }: { label: string, value: string | number | undefined }) {
    return (
        <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider">{label}</div>
            <div className="text-white font-mono font-medium">{value || '-'}</div>
        </div>
    );
}

function formatLargeNumber(num: number) {
    if (!num) return '-';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
}
