import React from 'react';
import { X, Download, Copy, Check, QrCode, Shield, ExternalLink } from 'lucide-react';

export default function QRModal({ isOpen, onClose, data }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data.id || data.batteryId || data.certificateId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCert = Boolean(data.certificateId);
  const identifier = isCert ? data.certificateId : data.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <QrCode className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {isCert ? 'EPR Certificate Seal' : 'Battery Digital Passport QR'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isCert
              ? 'Cryptographic verification seal minted on Hyperledger Fabric ledger'
              : 'Affix to battery packaging. Scan for consumer & recycler traceability'}
          </p>
        </div>

        {/* QR Image */}
        <div className="bg-white p-4 rounded-xl flex items-center justify-center mx-auto max-w-[260px] shadow-inner mb-4">
          {data.qrCode ? (
            <img src={data.qrCode} alt="QR Code" className="w-full h-full object-contain" />
          ) : (
            <div className="text-slate-500 text-xs font-mono py-12">Generating QR...</div>
          )}
        </div>

        {/* Identifier & Metadata */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2 mb-4 font-mono text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>{isCert ? 'Cert ID:' : 'Battery ID:'}</span>
            <span className="text-emerald-400 font-bold">{identifier}</span>
          </div>
          {data.model && (
            <div className="flex items-center justify-between text-slate-400">
              <span>Model:</span>
              <span className="text-slate-200 truncate max-w-[180px]">{data.model}</span>
            </div>
          )}
          {data.chemistry && (
            <div className="flex items-center justify-between text-slate-400">
              <span>Chemistry:</span>
              <span className="text-amber-400 font-semibold">{data.chemistry}</span>
            </div>
          )}
          {data.txId && (
            <div className="flex items-center justify-between text-slate-500 text-[10px]">
              <span>TxID:</span>
              <span className="truncate max-w-[180px]">{data.txId}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied ID' : 'Copy ID'}</span>
          </button>
          <a
            href={data.qrCode}
            download={`${identifier}-QR.png`}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Sticker</span>
          </a>
        </div>
      </div>
    </div>
  );
}
