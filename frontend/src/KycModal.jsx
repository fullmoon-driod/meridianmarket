import React, { useState } from 'react';
import { X, Upload, ShieldCheck, CheckCircle2, FileText, User, MapPin, Calendar, Lock } from 'lucide-react';

export default function KycModal({ isOpen, onClose, user, onKycSubmit }) {
  const [step, setStep] = useState(1); // Step 1: Info | Step 2: Document Upload | Step 3: Success
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    nationality: 'Philippines',
    address: '',
    city: '',
    idType: 'Passport', // Passport | Driver License | National ID
    idNumber: '',
  });

  const [documentFile, setDocumentFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, setFile) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.fullName || !formData.dob || !formData.address) return;
      setStep(2);
    }
  };

  const handleSubmitKyc = (e) => {
    e.preventDefault();
    if (!documentFile) return;

    setIsSubmitting(true);

    // Simulate backend verification submission
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(3);
      if (onKycSubmit) {
        onKycSubmit({
          ...formData,
          documentName: documentFile.name,
          selfieName: selfieFile ? selfieFile.name : null,
          status: 'PENDING_VERIFICATION',
          submittedAt: new Date().toISOString(),
        });
      }
    }, 1500);
  };

  const handleClose = () => {
    setStep(1);
    setDocumentFile(null);
    setSelfieFile(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl font-sans text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">Identity Verification (KYC)</h2>
              <p className="text-[11px] text-slate-400">Regulatory compliance for live trading & withdrawals</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-8 py-3 bg-slate-950 border-b border-slate-800/60 text-xs font-mono">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">1</span>
            <span>Personal Info</span>
          </div>
          <div className="h-px w-10 bg-slate-800"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">2</span>
            <span>Document Upload</span>
          </div>
          <div className="h-px w-10 bg-slate-800"></div>
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px]">3</span>
            <span>Confirmation</span>
          </div>
        </div>

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="fullName"
                    required
                    placeholder="As shown on ID"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Date of Birth</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="date"
                    name="dob"
                    required
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Nationality</label>
                <select
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Philippines">Philippines</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="United States">United States</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">City / Region</label>
                <input
                  type="text"
                  name="city"
                  required
                  placeholder="e.g. Manila"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Residential Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  name="address"
                  required
                  placeholder="Street address, apartment, unit"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/10"
              >
                Continue to Document Upload &rarr;
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Document Upload */}
        {step === 2 && (
          <form onSubmit={handleSubmitKyc} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">ID Document Type</label>
                <select
                  name="idType"
                  value={formData.idType}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Passport">Passport</option>
                  <option value="Driver License">Driver's License</option>
                  <option value="National ID">Government / National ID</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">Document Number</label>
                <input
                  type="text"
                  name="idNumber"
                  required
                  placeholder="ID / Passport Number"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Upload Area: ID Front/Back */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                Upload {formData.idType} (Front Photo / Scan)
              </label>
              <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950 rounded-xl cursor-pointer transition-all">
                <Upload className="w-6 h-6 text-slate-500 mb-2" />
                <span className="text-xs text-slate-300 font-mono">
                  {documentFile ? documentFile.name : 'Click to select ID photo or drag file here'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG, PDF (Max 10MB)</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required
                  onChange={(e) => handleFileChange(e, setDocumentFile)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Optional Selfie Upload */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                Proof of Facial Verification (Selfie holding ID - Optional)
              </label>
              <label className="flex items-center justify-between p-3 border border-slate-800 bg-slate-950 rounded-xl cursor-pointer hover:border-slate-700 transition-all">
                <span className="text-xs text-slate-400 font-mono truncate">
                  {selfieFile ? selfieFile.name : 'Upload selfie photo (Optional)'}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded">Browse</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setSelfieFile)}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold font-mono text-xs rounded-xl transition-all"
              >
                &larr; Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Encrypting & Uploading...</span>
                ) : (
                  <span>Submit Verification Documents</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 3 && (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Verification Submitted!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{formData.fullName}</strong>. Your documents have been encrypted and submitted to compliance. Verification usually takes 1 to 12 hours.
              </p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left text-[11px] font-mono text-slate-400 max-w-xs mx-auto space-y-1">
              <div className="flex justify-between"><span>Status:</span> <span className="text-cyan-400">Under Review</span></div>
              <div className="flex justify-between"><span>Document:</span> <span className="text-slate-200">{formData.idType}</span></div>
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-mono transition-all mt-2"
            >
              Return to Trading Terminal
            </button>
          </div>
        )}

        {/* Encryption Footer Banner */}
        <div className="bg-slate-950 px-6 py-2.5 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500">
          <Lock className="w-3 h-3 text-cyan-400" />
          <span>256-Bit SSL Encrypted Vault Submission</span>
        </div>

      </div>
    </div>
  );
}