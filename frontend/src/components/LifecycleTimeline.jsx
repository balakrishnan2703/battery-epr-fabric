import React from 'react';
import { 
  Factory, 
  Users, 
  Truck, 
  Recycle, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function LifecycleTimeline({ battery, history = [] }) {
  const steps = [
    {
      id: 'MANUFACTURED',
      title: 'Manufacturer',
      desc: 'Unique ID & QR Minted on Ledger',
      icon: Factory,
      color: 'blue'
    },
    {
      id: 'IN_USE',
      title: 'Consumer',
      desc: 'EV/Industrial In-Service Operation',
      icon: Users,
      color: 'amber'
    },
    {
      id: 'COLLECTED',
      title: 'Informal Collector',
      desc: 'Scrap Market Aggregation',
      icon: Truck,
      color: 'purple'
    },
    {
      id: 'RECEIVED_BY_RECYCLER',
      title: 'Authorized Recycler',
      desc: 'CPCB License Validated & Received',
      icon: Recycle,
      color: 'teal'
    },
    {
      id: 'RECYCLED',
      title: 'EPR Certificate',
      desc: 'Materials Recovered & EPR Minted',
      icon: Award,
      color: 'emerald'
    },
    {
      id: 'EPR_CERTIFIED',
      title: 'CPCB Regulator',
      desc: 'EPR Compliance Sealed & Audited',
      icon: ShieldCheck,
      color: 'rose'
    }
  ];

  // Map status to active index
  const statusOrder = [
    'MANUFACTURED', 
    'IN_USE', 
    'COLLECTED', 
    'RECEIVED_BY_RECYCLER', 
    'RECYCLED', 
    'EPR_CERTIFIED'
  ];
  const currentIdx = statusOrder.indexOf(battery?.status || 'MANUFACTURED');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Battery Traceability Lifecycle Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically enforced state transitions on Hyperledger Fabric
          </p>
        </div>
        {battery && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">Current Status:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {battery.status}
            </span>
          </div>
        )}
      </div>

      {/* Visual Pipeline Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isPassed = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          // Find transition in history if available
          const histItem = history.find(h => h.value?.status === step.id);

          return (
            <div
              key={step.id}
              className={`relative rounded-xl p-3.5 border transition-all ${
                isCurrent
                  ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                  : isPassed
                  ? 'bg-slate-900/80 border-slate-700/80 text-slate-300'
                  : 'bg-slate-950/40 border-slate-800/40 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isPassed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-700 text-[10px] flex items-center justify-center text-slate-600 font-mono">
                    {idx + 1}
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold text-white tracking-tight">{step.title}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{step.desc}</p>

              {histItem && (
                <div className="mt-2.5 pt-2 border-t border-slate-800 text-[9px] font-mono text-slate-400 space-y-0.5">
                  <div className="flex items-center space-x-1 text-emerald-400 truncate">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(histItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <div className="truncate text-slate-500" title={histItem.txId}>
                    Tx: {histItem.txId.substring(0, 10)}...
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
