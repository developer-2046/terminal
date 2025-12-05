"use client"

import { useState } from 'react';
import { Plus, X, BarChart2 } from 'lucide-react';

interface WatchlistProps {
    symbols: string[];
    activeSymbol: string;
    onSelect: (symbol: string) => void;
    onUpdate: (symbols: string[]) => void;
}

export const Watchlist = ({ symbols, activeSymbol, onSelect, onUpdate }: WatchlistProps) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [tempSymbol, setTempSymbol] = useState("");

    const handleStartEdit = (index: number) => {
        setEditingIndex(index);
        setTempSymbol(symbols[index]);
    };

    const handleSaveEdit = (index: number) => {
        const newSymbols = [...symbols];
        newSymbols[index] = tempSymbol.toUpperCase();
        onUpdate(newSymbols);
        setEditingIndex(null);
        if (activeSymbol === symbols[index]) {
            onSelect(newSymbols[index]);
        }
    };

    return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Top 5 Watchlist</h3>
            <div className="space-y-2">
                {symbols.map((sym, idx) => (
                    <div
                        key={idx}
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${sym === activeSymbol
                                ? 'bg-blue-900/30 border border-blue-500/50'
                                : 'bg-black border border-gray-800 hover:border-gray-600'
                            }`}
                        onClick={() => editingIndex !== idx && onSelect(sym)}
                    >
                        {editingIndex === idx ? (
                            <div className="flex items-center gap-2 w-full">
                                <input
                                    autoFocus
                                    value={tempSymbol}
                                    onChange={(e) => setTempSymbol(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(idx)}
                                    className="bg-gray-800 text-white px-2 py-1 rounded w-full text-sm font-bold uppercase"
                                />
                                <button onClick={() => handleSaveEdit(idx)} className="text-green-400"><Plus size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-8 rounded-full ${sym === activeSymbol ? 'bg-blue-500' : 'bg-gray-700'}`} />
                                    <div>
                                        <div className="font-bold text-lg">{sym}</div>
                                        <div className="text-xs text-gray-500">Stock Asset</div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleStartEdit(idx); }}
                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-white transition-opacity"
                                >
                                    Edit
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
