const WebSocket = require('ws');

class PriceFeedManager {
  constructor(broadcastCallback) {
    this.broadcastCallback = broadcastCallback;
    this.prices = {
      EURUSD: { bid: 1.0850, ask: 1.0852, category: 'MAJOR_FOREX' },
      BTCUSD: { bid: 65000.00, ask: 65010.00, category: 'CRYPTO' }
    };
  }

  start() {
    this.connectBinanceCryptoFeed();
    this.startForexSimulatedFeed();
  }

  connectBinanceCryptoFeed() {
    try {
      const binanceWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
      
      binanceWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data);
          const rawPrice = parseFloat(parsed.c);
          this.prices.BTCUSD = {
            bid: parseFloat((rawPrice - 5).toFixed(2)),
            ask: parseFloat((rawPrice + 5).toFixed(2)),
            category: 'CRYPTO'
          };
          if (this.broadcastCallback) this.broadcastCallback(this.prices);
        } catch (err) {}
      });

      binanceWs.on('error', () => {
        console.log('Binance WS fallback active');
      });
    } catch (e) {
      console.log('Starting simulated price engine...');
    }
  }

  startForexSimulatedFeed() {
    setInterval(() => {
      const delta = (Math.random() - 0.5) * 0.0008;
      const currentBid = this.prices.EURUSD.bid + delta;
      this.prices.EURUSD = {
        bid: parseFloat(currentBid.toFixed(5)),
        ask: parseFloat((currentBid + 0.0002).toFixed(5)),
        category: 'MAJOR_FOREX'
      };
      if (this.broadcastCallback) this.broadcastCallback(this.prices);
    }, 1000);
  }
}

module.exports = PriceFeedManager;