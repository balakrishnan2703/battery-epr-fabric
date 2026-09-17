import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Package,
  Layers,
  Search
} from 'lucide-react';
import LifecycleTimeline from '../components/LifecycleTimeline';

export default function CollectorPortal() {
  const [collectorId, setCollectorId] = useState('COLL-INFOR-BLR-09');
  const [collectionLocation, setCollectionLocation] = useState('Shivajinagar Scrap Yard, Bengaluru');
  const [condition, setCondition] = useState('USED_DEPLETED');
  const [selectedBatteryId, setSelectedBatteryId] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [inUseBatteries, setInUseBatteries] = useState([]);
  const [selectedBattery, setSelectedBattery] = useState(null);
  const [history, setHistory] = useState([]);

  const fetchBatteries = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/batteries');
      const json = await res.json();
      if (json.batteries) {
        // Find batteries eligible for collection (MANUFACTURED or IN_USE)
        const eligible = json.batteries.filter(b => b.status === 'IN_USE' || b.status === 'MANUFACTURED');
        setInUseBatteries(eligible);
        if (eligible.length > 0 && !selectedBatteryId) {
          selectBattery(eligible[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBatteries();
  }, []);

  const selectBattery = async (id) => {
    setSelectedBatteryId(id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const [bRes, hRes] = await Promise.all([
        fetch(`http://localhost:5000/api/batteries/${id}`),
        fetch(`http://localhost:5000/api/batteries/${id}/history`)
      ]);
      const bData = await bRes.json();
      const hData = await hRes.json();
      if (bData.success) setSelectedBattery(bData.battery);
      if (hData.success) setHistory(hData.history);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCollect = async (e) => {
    e.preventDefault();
    if (!selectedBatteryId) {
      setErrorMessage('Please select or input a Battery ID to collect.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('http://localhost:5000/api/batteries/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batteryId: selectedBatteryId,
          collectorId,
          collectionLocation,
          condition
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to log collection on Fabric ledger');
      }

      setSuccessMessage(`Scrap collection for Battery ${selectedBatteryId} committed on Fabric Block #${data.blockNumber}!`);
      selectBattery(selectedBatteryId);
      fetchBatteries();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Informal Scrap Collector Intake Portal</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                  Aggregation Node
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Formalize informal scrap aggregators under CPCB guidelines by logging custody of end-of-life batteries directly onto the blockchain.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: 6 cols */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Package className="w-4 h-4 text-purple-400" />
                <span>Log Battery Scrap Collection</span>
              </h3>
              <span className="text-[11px] text-slate-400">Step 3 of EPR Lifecycle</span>
            </div>

            {/* Select eligible battery */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Battery Available for Scrap Pickup:
              </label>
              {inUseBatteries.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {inUseBatteries.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => selectBattery(b.id)}
                      className={`p-3 rounded-xl border cursor-pointer text-xs font-mono transition-all flex items-center justify-between ${
                        selectedBatteryId === b.id
                          ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-white">{b.id}</div>
                        <div className="text-[11px] text-slate-400 font-sans">{b.model} ({b.weightKg} kg)</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-amber-400">
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                  No active batteries in MANUFACTURED or IN_USE state. Register a new battery in the Manufacturer Portal first.
                </div>
              )}
            </div>

            {/* Manual input fallback */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Or Enter Custom Battery ID:
              </label>
              <input
                type="text"
                value={selectedBatteryId}
                onChange={(e) => {
                  setSelectedBatteryId(e.target.value);
                  selectBattery(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                placeholder="e.g. BAT-IND-2026-XXXXXX"
              />
            </div>

            <form onSubmit={handleCollect} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Registered Collector ID / Scrap License <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={collectorId}
                  onChange={(e) => setCollectorId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  placeholder="e.g. COLL-INFOR-BLR-09"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Collection Location / Aggregation Point <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={collectionLocation}
                  onChange={(e) => setCollectionLocation(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Shivajinagar Scrap Yard, Bengaluru"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Battery Physical Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="USED_DEPLETED">Used / End-of-Life (Normal Depletion)</option>
                  <option value="PHYSICALLY_DAMAGED">Physically Damaged Casing</option>
                  <option value="SWOLLEN_CELL">Swollen / Bulging Cell</option>
                  <option value="ELECTROLYTE_LEAKAGE">Electrolyte Leakage</option>
                </select>
              </div>

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

              <button
                type="submit"
                disabled={loading || !selectedBatteryId}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                <span>Log Scrap Collection on Fabric Ledger</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Details: 6 cols */}
        <div className="lg:col-span-6 space-y-6">
          {selectedBattery ? (
            <div className="space-y-6">
              <LifecycleTimeline battery={selectedBattery} history={history} />

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Custody Record on Fabric Ledger
                </h3>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Battery ID:</span>
                    <span className="text-purple-400 font-bold">{selectedBattery.id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Current Status:</span>
                    <span className="text-emerald-400 font-bold">{selectedBattery.status}</span>
                  </div>
                  {selectedBattery.collectorId && (
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">Collector ID:</span>
                      <span className="text-white">{selectedBattery.collectorId}</span>
                    </div>
                  )}
                  {selectedBattery.collectionLocation && (
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">Location:</span>
                      <span className="text-white font-sans truncate max-w-[200px]">{selectedBattery.collectionLocation}</span>
                    </div>
                  )}
                  {selectedBattery.collectionDate && (
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">Logged At:</span>
                      <span className="text-slate-300">{new Date(selectedBattery.collectionDate).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {selectedBattery.status === 'COLLECTED' && (
                  <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Battery collected! Ready to be handed over to an Authorized Recycler in Step 4.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-2">
              <Package className="w-8 h-8 mx-auto text-slate-600" />
              <p>Select or enter a Battery ID on the left to inspect its custody state.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
