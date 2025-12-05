"use client";

import { useEffect, useState } from 'react';
import { ArrowLeft, Search, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function OptionsPage() {
    const [symbol, setSymbol] = useState("SPY");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>("");

    const fetchOptions = async (sym: string, date?: string) => {
        setLoading(true);
        try {
            let url = `http://localhost:8000/api/options/${sym}`;
            if (date) url += `?date=${date}`;

            const res = await fetch(url);
            const json = await res.json();
            setData(json);
            if (!date && json.selected_date) {
                setSelectedDate(json.selected_date);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptions(symbol);
    }, []);

    const handleBuy = async (opt: any, type: "call" | "put") => {
        const quantity = prompt(`Enter quantity to buy for ${symbol} ${opt.strike} ${type.toUpperCase()}:`, "1");
        if (!quantity) return;

        try {
            const res = await fetch('http://localhost:8000/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: symbol,
                    action: "buy",
                    quantity: parseInt(quantity),
                    price: opt.lastPrice,
                    asset_type: "option",
                    option_type: type,
                    strike: opt.strike,
                    expiration: selectedDate
                })
            });
            const json = await res.json();
            if (json.status === "success") {
                alert("Trade Successful!");
            } else {
                alert("Trade Failed: " + json.detail);
            }
        } catch (e) {
            console.error(e);
            alert("Trade Error");
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchOptions(symbol);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const date = e.target.value;
        setSelectedDate(date);
        fetchOptions(symbol, date);
    };

    return (
        <main className="min-h-screen bg-black text-white p-6 font-sans">
            <header className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
                <Link href="/" className="p-2 hover:bg-gray-800 rounded-full transition">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-600 bg-clip-text text-transparent font-mono">
                    OPTIONS CHAIN
                </h1>
            </header>

            <div className="flex gap-4 mb-8">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                        placeholder="Symbol (e.g. SPY)"
                    />
                    <button type="submit" className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded font-bold transition">
                        <Search className="w-4 h-4" />
                    </button>
                </form>

                {data?.expirations && (
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <select
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                        >
                            {data.expirations.map((date: string) => (
                                <option key={date} value={date}>{date}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* CALLS */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-hidden">
                        <h2 className="text-xl font-bold text-green-400 mb-4 text-center">CALLS</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="text-gray-400 uppercase bg-gray-800">
                                    <tr>
                                        <th className="px-2 py-2">Strike</th>
                                        <th className="px-2 py-2">Last</th>
                                        <th className="px-2 py-2">Δ</th>
                                        <th className="px-2 py-2">Γ</th>
                                        <th className="px-2 py-2">Θ</th>
                                        <th className="px-2 py-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.calls?.map((opt: any) => (
                                        <tr key={opt.contractSymbol} className="border-b border-gray-800 hover:bg-gray-800/50 group">
                                            <td className="px-2 py-2 font-bold text-white">{opt.strike}</td>
                                            <td className="px-2 py-2 text-green-300">{opt.lastPrice}</td>
                                            <td className="px-2 py-2 text-gray-500 group-hover:text-white">{opt.delta?.toFixed(2)}</td>
                                            <td className="px-2 py-2 text-gray-500 group-hover:text-white">{opt.gamma?.toFixed(3)}</td>
                                            <td className="px-2 py-2 text-gray-500 group-hover:text-white">{opt.theta?.toFixed(2)}</td>
                                            <td className="px-2 py-2">
                                                <button
                                                    onClick={() => handleBuy(opt, "call")}
                                                    className="bg-green-900/50 hover:bg-green-600 text-green-400 hover:text-white px-2 py-1 rounded text-xs transition"
                                                >
                                                    Buy
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PUTS */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-hidden">
                        <h2 className="text-xl font-bold text-red-400 mb-4 text-center">PUTS</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="text-gray-400 uppercase bg-gray-800">
                                    <tr>
                                        <th className="px-2 py-2">Strike</th>
                                        <th className="px-2 py-2">Last</th>
                                        <th className="px-2 py-2">Δ</th>
                                        <th className="px-2 py-2">Γ</th>
                                        <th className="px-2 py-2">Θ</th>
                                        <th className="px-2 py-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.puts?.map((opt: any) => (
                                        <tr key={opt.contractSymbol} className="border-b border-gray-800 hover:bg-gray-800/50 group">
                                            <td className="px-2 py-2 font-bold text-white">{opt.strike}</td>
                                            <td className="px-2 py-2 text-red-300">{opt.lastPrice}</td>
                                            <td className="px-2 py-2 text-gray-500 group-hover:text-white">{opt.delta?.toFixed(2)}</td>
                                            <td className="px-2 py-2 text-gray-500 group-hover:text-white">{opt.gamma?.toFixed(3)}</td>
                                            <td className="px-2 py-2 text-gray-500 group-hover:text-white">{opt.theta?.toFixed(2)}</td>
                                            <td className="px-2 py-2">
                                                <button
                                                    onClick={() => handleBuy(opt, "put")}
                                                    className="bg-red-900/50 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1 rounded text-xs transition"
                                                >
                                                    Buy
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
