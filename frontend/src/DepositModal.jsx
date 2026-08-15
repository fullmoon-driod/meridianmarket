import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, ArrowRight, Wallet, UserCheck } from 'lucide-react';

export default function DepositModal({ isOpen, onClose, user, onDepositSubmit, onOpenKyc }) {
  const [selectedNetwork, setSelectedNetwork] = useState('TRC20');
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const walletAddresses = {
    TRC20: 'TYu8X9pLqZk2mN3vR5wB7xP1aS4dE6fG8H',
    ERC20: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  };

  if (!isOpen) return null;

  const currentAddress = walletAddresses[selectedNetwork];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = (e) => {
    e.preventDefault();
    if (!amount || !txHash) return;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      if (onDepositSubmit) {
        onDepositSubmit({
          amount: parseFloat(amount),
          txHash,
          network: selectedNetwork,
          method: 'Coins.ph USDT',
          timestamp: new Date().toISOString(),
        });
      }
    }, 1200);
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
              <h2 className="font-bold text-sm tracking-wide text-white">Deposit via Coins.ph (USDT)</h2>
              <p className="text-[11px] text-slate-400">Fast PHP to USDT transfer via Philippine Gateway</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!submitted ? (
          <div className="p-6 space-y-5">
            
            <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-xl flex items-start gap-3">
              <div className="bg-cyan-500/10 text-cyan-400 p-1.5 rounded-lg text-xs font-bold font-mono mt-0.5">
                PHP
              </div>
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white block mb-0.5">Coins.ph Transfer Guide:</span>
                Open your <strong className="text-cyan-400">Coins.ph app</strong> &rarr; Select <strong>Crypto (USDT)</strong> &rarr; Send/Withdraw to the wallet address below.
              </div>
            </div>

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

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
                Deposit Address (Coins.ph Destination)
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
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Coins.ph TxID / Reference No.</label>
                  <input
                    type="text"
                    placeholder="Paste transaction hash"
                    required
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
                  <span>Verifying Transfer...</span>
                ) : (
                  <>
                    <span>Confirm Coins.ph Deposit</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation State with Direct KYC CTA */
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Deposit Submitted!</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                We are validating your transfer of <strong className="text-emerald-400">${amount} USDT</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-left text-xs space-y-1">
              <span className="text-cyan-400 font-bold block flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Step 2: Identity Verification
              </span>
              <p className="text-slate-400 text-[11px]">
                To activate full account access and trading withdrawals, please complete your account KYC verification.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-all"
              >
                Skip for Now
              </button>
              <button
                onClick={handleProceedToKyc}
                className="w-1/2 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs font-mono transition-all shadow-md shadow-cyan-500/10"
              >
                Verify Identity Now &rarr;
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}