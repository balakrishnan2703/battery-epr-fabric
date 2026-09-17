import React from 'react';
import { 
  Factory, 
  Users, 
  Truck, 
  Recycle, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, networkStatus, onOpenExplorer, onOpenGuide }) {
  const navItems = [
    { id: 'manufacturer', label: '1. Manufacturer', icon: Factory, color: 'text-blue-400' },
    { id: 'consumer', label: '2. Consumer', icon: Users, color: 'text-amber-400' },
    { id: 'collector', label: '3. Collector', icon: Truck, color: 'text-purple-400' },
    { id: 'recycler', label: '4. Recycler', icon: Recycle, color: 'text-emerald-400' },
    { id: 'regulator', label: '5. CPCB Regulator', icon: ShieldCheck, color: 'text-rose-400' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Recycle className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">EPR-Battery Ledger</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  CPCB BWMR 2022
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Hyperledger Fabric National Traceability & EPR Verification Network
              </p>
            </div>
          </div>

          {/* Right Action buttons & Network indicator */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenGuide}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Demo Walkthrough</span>
            </button>

            <button
              onClick={onOpenExplorer}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 text-xs font-mono transition-colors border border-emerald-800/60"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{networkStatus?.latestBlockNumber !== undefined ? `Block #${networkStatus.latestBlockNumber}` : 'Blocks unavailable'}</span>
            </button>

            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800 text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 hidden md:inline">Fabric Live</span>
            </div>
          </div>
        </div>

        {/* Role Tabs Bar */}
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.color}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
