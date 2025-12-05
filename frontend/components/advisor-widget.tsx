"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Brain, ArrowRight, Loader2 } from 'lucide-react';

interface AdvisorWidgetProps {
    symbol: string;
}

export const AdvisorWidget = ({ symbol }: AdvisorWidgetProps) => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    // Reset state when symbol changes
    useEffect(() => {
        setData(null);
        setLoading(false);
    }, [symbol]);

    const runAnalysis = async () => {
        if (!symbol) return;
        setLoading(true);
        setData(null);
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

    const getSignalColor = (signal: string) => {
        if (signal?.includes('BUY')) return 'text-green-400';
        if (signal?.includes('SELL')) return 'text-red-400';
        return 'text-yellow-400';
    };

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg min-h-[200px] flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2 text-purple-400">
                    <Brain size={20} /> AI Advisor
                </h3>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-3">
                    <Loader2 size={32} className="animate-spin text-purple-500" />
                    <p className="text-gray-400 text-sm animate-pulse">Generating Investment Advice...</p>
                </div>
            ) : data ? (
                <div className="text-center space-y-4">
                    <div>
                        <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Recommendation</div>
                        <div className={`text-3xl font-black font-mono tracking-tight ${getSignalColor(data.signal)}`}>
                            {data.signal}
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-sm bg-black/30 p-3 rounded-lg border border-gray-800">
                        <span className="text-gray-400">Confidence</span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getSignalColor(data.signal).replace('text-', 'bg-')}`}
                                    style={{ width: `${data.confidence * 100}%` }}
                                />
                            </div>
                            <span className="font-mono font-bold">{(data.confidence * 100).toFixed(0)}%</span>
                        </div>
                    </div>

                    <Link
                        href={`/advisor/${symbol}`}
                        className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                        View Full Analysis <ArrowRight size={16} />
                    </Link>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <p className="text-gray-400 text-sm text-center">
                        Run the AI engine to generate a Bayesian investment recommendation for {symbol}.
                    </p>
                    <button
                        onClick={runAnalysis}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg shadow-purple-900/20 flex items-center gap-2"
                    >
                        <Brain size={18} /> Run AI Analysis
                    </button>
                </div>
            )}
        </div>
    );
};
