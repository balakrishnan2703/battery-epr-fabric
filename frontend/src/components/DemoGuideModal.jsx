import React from 'react';
import { 
  X, 
  HelpCircle, 
  Factory, 
  Users, 
  Truck, 
  Recycle, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Award
} from 'lucide-react';

export default function DemoGuideModal({ isOpen, onClose, onSelectTab }) {
  if (!isOpen) return null;

  const steps = [
    {
      tab: 'manufacturer',
      title: 'Step 1: Manufacturer Registers Battery',
      icon: Factory,
      color: 'text-blue-400',
      action: 'Go to Manufacturer Portal',
      description: 'Fill in battery chemistry (e.g. Lithium-Ion EV Pack), model, gross weight, and producer EPR number. Click "Mint Battery ID & QR Code on Ledger" to record state MANUFACTURED in Block #N.'
    },
    {
      tab: 'consumer',
      title: 'Step 2: Consumer Scans & Activates',
      icon: Users,
      color: 'text-amber-400',
      action: 'Go to Consumer Portal',
      description: 'View the battery digital passport, inspect safety notices, and click "Activate Battery in Consumer Operation" to transition state to IN_USE.'
    },
    {
      tab: 'collector',
      title: 'Step 3: Informal Collector Logs Scrap',
      icon: Truck,
      color: 'text-purple-400',
      action: 'Go to Collector Portal',
      description: 'Pick the depleted battery, enter scrap yard location, and log collection to transition state to COLLECTED. This formalizes scrap aggregation on-chain.'
    },
    {
      tab: 'recycler',
      title: 'Step 4: Authorized Recycler Processes & Mints EPR',
      icon: Recycle,
      color: 'text-emerald-400',
      action: 'Go to Recycler Portal',
      description: 'Accept custody (state RECEIVED_BY_RECYCLER), input recovered Lead/Lithium/Cobalt kg, and click "Recycle Battery & Mint EPR Certificate". Notice the smart contract automatically verifies CPCB authorization, mints the EPR certificate, and prevents double recycling!'
    },
    {
      tab: 'regulator',
      title: 'Step 5: CPCB Regulator Verifies & Audits',
      icon: ShieldCheck,
      color: 'text-rose-400',
      action: 'Go to CPCB Regulator Portal',
      description: 'Click "Test Valid Certificate" to see the green cryptographic seal verification. Then click "Test Fake/Counterfeit ID" to see the smart contract fraud rejection! Finally, audit the chronological transaction history (GetHistoryForKey) with all TxIDs.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Battery EPR Blockchain Demonstration Guide
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Follow this 5-stage workflow for a complete college presentation or evaluation
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl bg-slate-900 ${s.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{s.title}</h3>
                  </div>

                  <button
                    onClick={() => {
                      onSelectTab(s.tab);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 transition-colors border border-slate-700"
                  >
                    <span>{s.action}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-10">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
              Network: Hyperledger Fabric | Channel: mychannel
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Start Demonstration
          </button>
        </div>
      </div>
    </div>
  );
}
