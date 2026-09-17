import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  FileCheck
} from 'lucide-react';
import LifecycleTimeline from '../components/LifecycleTimeline';

export default function ConsumerPortal() {
  const [batteryIdInput, setBatteryIdInput] = useState('');
  const [battery, setBattery] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [availableBatteries, setAvailableBatteries] = useState([]);

  const loadRecentBatteries = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/batteries');
      const json = await res.json();
      if (json.batteries) {
        setAvailableBatteries(json.batteries);
        if (json.batteries.length > 0 && !battery) {
          lookupBattery(json.batteries[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRecentBatteries();
  }, []);

  const lookupBattery = async (id) => {
    const searchId = id || batteryIdInput.trim();
    if (!searchId) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const [bRes, hRes] = await Promise.all([
        fetch(`http://localhost:5000/api/batteries/${searchId}`),
        fetch(`http://localhost:5000/api/batteries/${searchId}/history`)
      ]);

      const bData = await bRes.json();
      const hData = await hRes.json();

      if (!bRes.ok || !bData.success) {
        throw new Error(bData.error || `Battery ${searchId} not found on Fabric ledger`);
      }

      setBattery(bData.battery);
      setBatteryIdInput(searchId);
      setHistory(hData.history || []);
    } catch (err) {
      setErrorMessage(err.message);
      setBattery(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateConsumer = async () => {
    if (!battery) return;
    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/batteries/transfer-consumer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batteryId: battery.id,
          consumerRegion: 'Karnataka / Bengaluru Metro'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to activate battery');
      }

      setSuccessMessage(`Battery ${battery.id} successfully activated in consumer operation!`);
      lookupBattery(battery.id);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Consumer Battery Passport & Disposal Portal</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  Public Transparency
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Scan or query the digital battery passport to check genuine manufacturer pedigree, hazardous material advisory, and scrap handover rights.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={batteryIdInput}
              onChange={(e) => setBatteryIdInput(e.target.value)}
              placeholder="Enter Battery ID (e.g. BAT-IND-2026-XXXXXX)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          </div>

          <button
            onClick={() => lookupBattery()}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Query Ledger</span>
          </button>
        </div>

        {availableBatteries.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto py-1 text-xs">
            <span className="text-slate-500 text-[11px] whitespace-nowrap">Demo Batteries:</span>
            {availableBatteries.slice(0, 5).map((b) => (
              <button
                key={b.id}
                onClick={() => lookupBattery(b.id)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all whitespace-nowrap border ${
                  battery?.id === b.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {b.id} ({b.status})
              </button>
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {battery && (
        <div className="space-y-6 animate-fade-in">
          <LifecycleTimeline battery={battery} history={history} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-amber-400" />
                <span>Verified Digital Battery Passport</span>
              </h3>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Battery ID:</span>
                  <span className="text-amber-400 font-bold">{battery.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Model:</span>
                  <span className="text-white font-sans font-medium">{battery.model}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Chemistry:</span>
                  <span className="text-emerald-400 font-bold">{battery.chemistry}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Gross Weight:</span>
                  <span className="text-slate-200">{battery.weightKg} kg</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Manufacturer ID:</span>
                  <span className="text-blue-400">{battery.manufacturerId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Producer EPR Reg:</span>
                  <span className="text-slate-300">{battery.producerEprNo}</span>
                </div>
                {battery.eprCertificateId && (
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">EPR Certificate:</span>
                    <span className="text-emerald-400 font-bold">{battery.eprCertificateId}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Consumer Environmental Advisory</span>
                </h3>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="font-semibold text-amber-400">
                    Hazardous Material Classification: {battery.chemistry}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Under Indian Battery Waste Management Rules (BWMR) 2022, dumping or open-burning of used batteries is punishable. Spent batteries must be returned to informal collectors or authorized collection points for channelization to CPCB authorized recyclers.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                  <div className="font-semibold">Deposit Refund & Scrap Value</div>
                  <p className="text-[11px] text-emerald-400/80">
                    You are eligible for scrap credit or buyback rebate when surrendering this unit to a registered collector.
                  </p>
                </div>
              </div>

              {battery.status === 'MANUFACTURED' && (
                <button
                  onClick={handleActivateConsumer}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  <span>Activate Battery in Consumer Operation (Transition to IN_USE)</span>
                </button>
              )}

              {battery.status === 'IN_USE' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                  Battery is currently in operational service. Proceed to the <span className="text-purple-400 font-semibold">Collector Portal</span> to simulate end-of-life scrap collection.
                </div>
              )}

              {battery.status === 'COLLECTED' && (
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-center text-xs text-purple-300">
                  Battery has been aggregated by Informal Collector. Ready for handover to Authorized Recycler!
                </div>
              )}

              {battery.status === 'EPR_CERTIFIED' && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-center text-xs text-emerald-300">
                  Battery has completed its circular lifecycle and EPR Certificate has been minted on Fabric!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
