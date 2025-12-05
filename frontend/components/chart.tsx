"use client"

import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface ChartProps {
    data: any[];
    simulations?: any[][];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
}

export const Chart = ({ data, simulations, colors: {
    backgroundColor = 'black',
    lineColor = '#2962FF',
    textColor = 'white',
    areaTopColor = '#2962FF',
    areaBottomColor = 'rgba(41, 98, 255, 0.28)',
} = {} }: ChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: '#333' },
                horzLines: { color: '#333' },
            },
        });

        chart.timeScale().fitContent();

        // Main Data Series
        if (data && data.length > 0) {
            if (data[0].open) {
                // Candlestick Data
                const candlestickSeries = chart.addCandlestickSeries({
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                });
                candlestickSeries.setData(data.map(d => ({
                    time: d.date || d.time,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                })));
            } else if (data[0].value) {
                // Line Data (Equity Curve)
                const lineSeries = chart.addLineSeries({
                    color: lineColor,
                    lineWidth: 2,
                    crosshairMarkerVisible: true,
                });
                lineSeries.setData(data);

                // Add Area if colors provided
                if (areaTopColor && areaBottomColor) {
                    // We can't add AreaSeries on top of LineSeries easily with same data object in this structure
                    // without changing the component API significantly. 
                    // For now, LineSeries is sufficient for the Equity Curve.
                }
            }
        }
        // Handle Simulations
        if (simulations && simulations.length > 0) {
            const colors = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff0000'];

            // Prepare series and data
            const simSeriesRefs: any[] = [];
            const simDataMap: any[][] = [];

            simulations.forEach((sim, idx) => {
                const color = colors[idx % colors.length];
                const lineSeries = chart.addLineSeries({
                    color: color,
                    lineWidth: 2,
                    crosshairMarkerVisible: false,
                    lastValueVisible: false,
                    priceLineVisible: false,
                });

                simSeriesRefs.push(lineSeries);
                simDataMap.push(sim);
            });

            // Animation Loop
            let step = 0;
            const totalSteps = simDataMap[0]?.length || 0;

            const animate = () => {
                if (step >= totalSteps) return;

                simSeriesRefs.forEach((series, idx) => {
                    const nextPoint = simDataMap[idx][step];
                    series.update(nextPoint);
                });

                step++;

                // Auto-fit or scroll
                if (step % 5 === 0) {
                    chart.timeScale().scrollToPosition(0, false);
                }

                requestAnimationFrame(animate);
            };

            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, simulations, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]);

    return (
        <div
            ref={chartContainerRef}
            className="w-full h-[400px]"
        />
    );
};
