"use client"

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function SentimentPage() {
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');

    const analyzeSentiment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symbol) return;

        setLoading(true);
        setError('');
        setData(null);

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/sentiment/${symbol.toUpperCase()}`);
            if (!res.ok) throw new Error('Failed to fetch sentiment data');
            const result = await res.json();
            setData(result);
        } catch (err) {
            setError('Failed to analyze sentiment. Please check the symbol and try again.');
        } finally {
            setLoading(false);
        }
    };

    const getSentimentColor = (score: number) => {
        if (score > 0.6) return 'text-green-400';
        if (score < 0.4) return 'text-red-400';
        return 'text-gray-400';
    };

    const getSentimentBg = (score: number) => {
        if (score > 0.6) return 'bg-green-500/10 border-green-500/30';
        if (score < 0.4) return 'bg-red-500/10 border-red-500/30';
        return 'bg-gray-500/10 border-gray-500/30';
    };

    return (
        <main className="min-h-screen bg-black text-white p-6 font-sans">
            <header className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
                <Link href="/" className="p-2 hover:bg-gray-800 rounded-full transition">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent font-mono tracking-tighter">
                    SENTIMENT ENGINE
                </h1>
            </header>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Search */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                    <form onSubmit={analyzeSentiment} className="flex gap-4">
                        <input
                            type="text"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            placeholder="Enter Stock Symbol (e.g. TSLA)"
                            className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 text-lg text-white focus:outline-none focus:border-blue-500 uppercase font-mono"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Search size={20} /> Analyze
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
                        {error}
                    </div>
                )}

                {data && (
                    <div className="space-y-6">
                        {/* Overall Sentiment Card */}
                        <div className={`p-8 rounded-2xl border ${getSentimentBg(data.average_score)} flex items-center justify-between`}>
                            <div>
                                <h2 className="text-gray-400 text-sm uppercase tracking-wider mb-1">Overall Sentiment</h2>
                                <div className={`text-4xl font-bold ${getSentimentColor(data.average_score)} flex items-center gap-3`}>
                                    {data.overall_sentiment}
                                    {data.overall_sentiment === 'Positive' && <TrendingUp size={32} />}
                                    {data.overall_sentiment === 'Negative' && <TrendingDown size={32} />}
                                    {data.overall_sentiment === 'Neutral' && <Minus size={32} />}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">LSTM Score</div>
                                <div className="text-3xl font-mono font-bold text-white">
                                    {(data.average_score * 100).toFixed(1)}/100
                                </div>
                            </div>
                        </div>

                        {/* News List */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-300">Recent News Analysis</h3>
                            {data.news.map((item: any, idx: number) => (
                                <a
                                    key={idx}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block bg-gray-900 border border-gray-800 p-6 rounded-xl hover:border-gray-600 transition group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-lg font-semibold text-white group-hover:text-blue-400 transition line-clamp-2">
                                            {item.title}
                                        </h4>
                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ml-4 whitespace-nowrap ${getSentimentBg(item.sentiment_score)} ${getSentimentColor(item.sentiment_score)}`}>
                                            {item.sentiment_label}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                                        {item.summary}
                                    </p>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        <span>{new Date(item.time * 1000).toLocaleString()}</span>
                                        <span className="font-mono">Score: {item.sentiment_score.toFixed(2)}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
