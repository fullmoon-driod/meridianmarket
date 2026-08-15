import React, { useEffect, useRef } from 'react';

const SYMBOL_MAP = {
  'XAU/USD': 'OANDA:XAUUSD',
  'XAG/USD': 'OANDA:XAGUSD',
  'BTC/USD': 'BINANCE:BTCUSDT',
  'ETH/USD': 'BINANCE:ETHUSDT',
  'SOL/USD': 'BINANCE:SOLUSDT',
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  'US500': 'FOREXCOM:SPXUSD',
  'US100': 'FOREXCOM:NSXUSD',
};

export default function RealTimeChart({ symbol }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = ''; // Clear container

    const tvSymbol = SYMBOL_MAP[symbol] || `FX:${symbol.replace('/', '')}`;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: '1',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        container_id: containerRef.current.id,
        backgroundColor: '#090d16',
      });
    };
    containerRef.current.appendChild(script);
  }, [symbol]);

  return <div id="chart-container" ref={containerRef} className="w-full h-full min-h-[420px]" />;
}