import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, ArrowRight, Wallet, UserCheck, ExternalLink, Globe } from 'lucide-react';

export default function DepositModal({ isOpen, onClose, user, onDepositSubmit, onOpenKyc }) {
  const [selectedCountry, setSelectedCountry] = useState('Philippines');
  const [selectedNetwork, setSelectedNetwork] = useState('TRC20');
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Country Configuration mapping gateways, redirect URLs, and UI accents
  const countryConfig = {
    Philippines: {
      gatewayName: 'Coins.ph',
      currency: 'PHP',
      redirectUrl: 'https://coins.ph',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      guideText: 'Open your Coins.ph app → Select Crypto (USDT) → Send/Withdraw to the wallet address below.',
    },
    Malaysia: {
      gatewayName: 'Luno',
      currency: 'MYR',
      redirectUrl: 'https://www.luno.com/login',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      guideText: 'Open your Luno app → Select Crypto Wallet → Send/Transfer to the wallet address below.',
    },
    Thailand: {
      gatewayName: 'Binance',
      currency: 'THB',
      redirectUrl: 'https://www.binance.com',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      guideText: 'Open your Binance App → Go to Deposit/Withdraw Crypto → Send to the wallet address below.',
    },
  };

  const walletAddresses = {
    TRC20: 'TYu8X9pLqZk2mN3vR5wB7xP1aS4dE6fG8H',
    ERC20: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  };

  if (!isOpen) return null;

  const currentConfig = countryConfig[selectedCountry];
  const currentAddress = walletAddresses[selectedNetwork];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = (e) => {
    e.preventDefault();
    if (!amount) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);

      // 1. Submit pending deposit data to backend / parent callback
      if (onDepositSubmit) {
        onDepositSubmit({
          amount: parseFloat(amount),
          txHash: txHash || 'EXTERNAL_REDIRECT',
          network: selectedNetwork,
          country: selectedCountry,
          gateway: currentConfig.gatewayName,
          method: `${currentConfig.gatewayName} USDT`,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Immediately redirect client to their country's exchange gateway
      window.open(currentConfig.redirectUrl, '_blank');
    }, 1000);
  };

  const handleReset = () => {
    setSubmitted(false);
    setAmount('');
    setTxHash('');
    onClose();
  };

  const handleProceedToKyc = () => {
    handleReset();
    if (onOpenKyc) {
      onOpenKyc();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl font-sans text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">
                Deposit via {currentConfig.gatewayName} (USDT)
              </h2>
              <p className="text-[11px] text-slate-400">
                Regional Gateway Transfer for {selectedCountry}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!submitted ? (
          <div className="p-6 space-y-5">
            
            {/* Country Selector */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Select Region / Gateway
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(countryConfig).map((country) => (
                  <button
                    key={country}
                    type="button"
                    onClick={() => setSelectedCountry(country)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                      selectedCountry === country
                        ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{country}</span>
                    <span className="text-[9px] text-slate-400 font-normal">
                      {countryConfig[country].gatewayName}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Gateway Guide */}
            <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-xl flex items-start gap-3">
              <div className={`p-1.5 rounded-lg text-xs font-bold font-mono mt-0.5 border ${currentConfig.badgeColor}`}>
                {currentConfig.currency}
              </div>
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white block mb-0.5">
                  {currentConfig.gatewayName} Gateway Instructions:
                </span>
                {currentConfig.guideText}
              </div>
            </div>

            {/* USDT Network Choice */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-2 uppercase tracking-wider">
                Select USDT Network
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['TRC20', 'ERC20'].map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setSelectedNetwork(net)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold transition-all flex justify-between items-center ${
                      selectedNetwork === net
                        ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-lg shadow-cyan-500/5'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>USDT-{net}</span>
                    <span className="text-[10px] text-slate-500">{net === 'TRC20' ? 'Low Fee' : 'Ethereum'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Deposit Address */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
                Deposit Destination Address
              </label>
              <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <code className="text-xs font-mono text-emerald-400 flex-1 truncate">{currentAddress}</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Form Inputs */}
            <form onSubmit={handleSubmitDeposit} className="space-y-4 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Deposit Amount (USDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="10"
                    placeholder="e.g. 500"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    TxID / Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Paste transaction hash"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Initiating Gateway Redirect...</span>
                ) : (
                  <>
                    <span>Proceed to {currentConfig.gatewayName}</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation State with Updated Step 3 Guidance */
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Deposit Request Recorded!</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                We are tracking your pending transfer of <strong className="text-emerald-400">${amount} USDT</strong> via {currentConfig.gatewayName}.
              </p>
            </div>

            {/* STEP 3: ACCOUNT & IDENTITY VERIFICATION */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-left text-xs space-y-2">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Step 3: Identity & Account Verification
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Once your payment is dispatched via {currentConfig.gatewayName}, complete your account KYC verification to enable live trading execution and instant withdrawals.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleReset}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all"
              >
                Done
              </button>
              <button
                onClick={handleProceedToKyc}
                className="w-1/2 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs font-mono transition-all shadow-md shadow-cyan-500/10 flex items-center justify-center gap-1"
              >
                <span>Verify Identity Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}