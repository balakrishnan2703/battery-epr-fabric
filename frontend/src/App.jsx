import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ManufacturerPortal from './pages/ManufacturerPortal';
import ConsumerPortal from './pages/ConsumerPortal';
import CollectorPortal from './pages/CollectorPortal';
import RecyclerPortal from './pages/RecyclerPortal';
import RegulatorPortal from './pages/RegulatorPortal';
import BlockExplorer from './components/BlockExplorer';
import DemoGuideModal from './components/DemoGuideModal';
import { Layers, ShieldCheck, CheckCircle2, Box } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('manufacturer');
  const [networkStatus, setNetworkStatus] = useState(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/regulator/dashboard');
      const data = await res.json();
      if (data.networkStatus) {
        setNetworkStatus(data.networkStatus);
      }
    } catch (err) {
      console.error('Error checking network status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        networkStatus={networkStatus}
        onOpenExplorer={() => setIsExplorerOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'manufacturer' && <ManufacturerPortal onBatteryCreated={() => fetchStatus()} />}
        {activeTab === 'consumer' && <ConsumerPortal />}
        {activeTab === 'collector' && <CollectorPortal />}
        {activeTab === 'recycler' && <RecyclerPortal />}
        {activeTab === 'regulator' && <RegulatorPortal onOpenExplorer={() => setIsExplorerOpen(true)} />}
      </main>

      {/* Live Blockchain Status Strip */}
      <div className="bg-slate-900/80 border-t border-slate-800/80 py-3 px-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Hyperledger Fabric 2.5</span>
            </div>
            <span>•</span>
            <span>Channel: <strong className="text-slate-200">mychannel</strong></span>
            <span>•</span>
            <span>Chaincode: <strong className="text-slate-200">battery-epr</strong></span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsExplorerOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              <Box className="w-3.5 h-3.5" />
              <span>{networkStatus?.blockHeight !== undefined ? `Fabric Height: ${networkStatus.blockHeight}` : 'Fabric height unavailable'}</span>
            </button>
            <span className="text-slate-600 hidden md:inline">|</span>
            <span className="text-slate-500 hidden md:inline">Endorser: Org1MSP (peer0.org1.example.com)</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium text-slate-400">
            Blockchain-Based EPR Verification System for India’s Battery Recycling Sector
          </p>
          <p className="text-[11px] text-slate-600">
            Under Ministry of Environment, Forest & Climate Change (MoEFCC) & Central Pollution Control Board (CPCB) Guidelines
          </p>
        </div>
      </footer>

      {/* Modals */}
      <BlockExplorer
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
      />

      <DemoGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
