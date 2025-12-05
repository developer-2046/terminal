"use client"

import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface TradePanelProps {
    symbol: string;
    currentPrice: number;
    onTrade: () => void; // Callback to refresh portfolio
}

export const TradePanel = ({ symbol, currentPrice, onTrade }: TradePanelProps) => {
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");

    const handleTrade = async (action: "buy" | "sell") => {
        setLoading(true);
        setMsg("");
        try {
            const res = await fetch('http://localhost:8000/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol,
                    action,
                    quantity: Number(quantity),
                    price: currentPrice
                })
            });
            const data = await res.json();
            if (res.ok) {
                setMsg(`Success: ${action.toUpperCase()} ${quantity} ${symbol}`);
                onTrade();
            } else {
                setMsg(`Error: ${data.detail}`);
            }
        } catch (e) {
            setMsg("Network Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-900 rounded-lg border border-gray-800 text-white">
            <h2 className="text-xl font-bold mb-4">Trade {symbol}</h2>
            <div className="flex justify-between mb-4">
                <span className="text-gray-400">Price</span>
                <span className="font-mono text-xl">${currentPrice?.toFixed(2)}</span>
            </div>

            <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => handleTrade('buy')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold transition disabled:opacity-50"
                >
                    <ArrowUpCircle size={20} /> BUY
                </button>
                <button
                    onClick={() => handleTrade('sell')}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded font-bold transition disabled:opacity-50"
                >
                    <ArrowDownCircle size={20} /> SELL
                </button>
            </div>

            {msg && (
                <div className={`mt-4 text-center text-sm ${msg.startsWith("Success") ? "text-green-400" : "text-red-400"}`}>
                    {msg}
                </div>
            )}
        </div>
    );
};
