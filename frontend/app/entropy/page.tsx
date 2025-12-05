"use client";

import { useEffect, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { ArrowLeft, Activity, Zap } from 'lucide-react';
import Link from 'next/link';

export default function EntropyPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [displayData, setDisplayData] = useState<any>(null);

    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                let url = 'http://localhost:8000/api/entropy';
                const params = new URLSearchParams();
                if (startDate) params.append('start_date', startDate);
                if (endDate) params.append('end_date', endDate);
                
                if (params.toString()) url += `?${params.toString()}`;

                const res = await fetch(url);
                const json = await res.json();
                setData(json);
                // Default to latest
                if (json.data && json.data.length > 0) {
                    setDisplayData(json.data[json.data.length - 1]);
                } else {
                    setDisplayData(null);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [startDate, endDate]);

    // Handle date selection (for highlighting specific point)
    useEffect(() => {
        if (!data || !data.data) return;

        if (selectedDate) {
            // Find exact or closest date
            const found = data.data.find((d: any) => d.Date === selectedDate);
            if (found) {
                setDisplayData(found);
            } else {
                // If not found (e.g. weekend), find closest previous
                // Simple approach: just filter
                const sorted = [...data.data].sort((a: any, b: any) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
                const closest = sorted.filter((d: any) => d.Date <= selectedDate).pop();
                if (closest) setDisplayData(closest);
            }
        } else {
            // Reset to latest
            if (data.data.length > 0) {
                setDisplayData(data.data[data.data.length - 1]);
            }
        }
    }, [selectedDate, data]);

    useEffect(() => {
        if (data && data.data) {
            const chartContainer = document.getElementById('entropy-chart');
            if (chartContainer) {
                chartContainer.innerHTML = '';
                const chart = createChart(chartContainer, {
                    layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#DDD' },
                    grid: { vertLines: { color: '#333' }, horzLines: { color: '#333' } },
                    width: chartContainer.clientWidth,
                    height: 400,
                });

                const lineSeries = chart.addLineSeries({ color: '#22d3ee', lineWidth: 2 });

                const chartData = data.data.map((d: any) => ({
                    time: d.Date,
                    value: d.Entropy
                }));

                lineSeries.setData(chartData);

                // Add marker for selected date
                if (displayData) {
                    lineSeries.setMarkers([
                        {
                            time: displayData.Date,
                            position: 'inBar',
                            color: '#facc15',
                            shape: 'circle',
                            size: 8,
                        }
                    ]);
                }

                chart.timeScale().fitContent();
            }
        }
    }, [data, displayData]);

    const getInterpretation = (entropy: number, regime: string) => {
        if (regime.includes("Low")) {
            return "The market is highly structured and correlated. This often precedes a systemic shift or crash, as all sectors are moving together (herd behavior).";
        } else if (regime.includes("High")) {
            return "The market is in a state of high disorder and low correlation. Sectors are moving independently. This is typically a 'Random Walk' phase with lower systemic risk but harder trend prediction.";
        } else {
            return "The market is in a neutral state, balancing between order and disorder. Standard diversification strategies should work as expected.";
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-6 font-sans">
            <header className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-gray-800 rounded-full transition">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent font-mono">
                        MARKET ENTROPY ENGINE
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Start:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">End:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                    <div className="h-6 w-px bg-gray-700 mx-2"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Inspect:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stats Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-cyan-400" />
                                Regime ({displayData?.Date || "Latest"})
                            </h2>
                            <div className="text-3xl font-bold text-white mb-2">
                                {displayData?.Regime || "Unknown"}
                            </div>
                            <p className="text-gray-400 text-sm">
                                Based on Eigenvector Entropy
                            </p>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                Entropy Score
                            </h2>
                            <div className="text-5xl font-mono text-cyan-400">
                                {displayData?.Entropy?.toFixed(4)}
                            </div>
                        </div>

                        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
                            <h3 className="text-white font-bold mb-2">Interpretation</h3>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                {displayData ? getInterpretation(displayData.Entropy, displayData.Regime) : "Loading..."}
                            </p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4">Entropy Time Series</h2>
                        <div id="entropy-chart" className="w-full h-[400px]"></div>
                    </div>
                </div>
            )}
        </main>
    );
}
