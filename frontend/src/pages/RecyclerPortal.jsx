import React, { useState, useEffect } from 'react';
import { 
  Recycle, 
  Award, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  QrCode,
  Download,
  FileCheck2,
  Lock
} from 'lucide-react';
import LifecycleTimeline from '../components/LifecycleTimeline';
import QRModal from '../components/QRModal';

export default function RecyclerPortal() {
  const [recyclers, setRecyclers] = useState([]);
  const [selectedRecyclerId, setSelectedRecyclerId] = useState('REC-CPCB-KAR-042');
  const [isUnauthorizedSim, setIsUnauthorizedSim] = useState(false);

  const [collectedBatteries, setCollectedBatteries] = useState([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState('');
  const [selectedBattery, setSelectedBattery] = useState(null);
  const [history, setHistory] = useState([]);

  // Material Yields
  const [leadKg, setLeadKg] = useState('0');
  const [lithiumKg, setLithiumKg] = useState('2.4');
  const [cobaltKg, setCobaltKg] = useState('1.5');
  const [plasticsKg, setPlasticsKg] = useState('4.2');
  const [recoveryRatePct, setRecoveryRatePct] = useState('92.5');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(null);
  const [modalData, setModalData] = useState(null);

  const fetchInitialData = async () => {
    try {
      const [rRes, bRes] = await Promise.all([
        fetch('http://localhost:5000/api/recyclers'),
        fetch('http://localhost:5000/api/batteries')
      ]);

      const rData = await rRes.json();
      const bData = await bRes.json();

      if (rData.recyclers) setRecyclers(rData.recyclers);
      if (bData.batteries) {
        setCollectedBatteries(bData.batteries);
        // Default to a collected or active battery
        const ready = bData.batteries.find(b => b.status === 'COLLECTED' || b.status === 'RECEIVED_BY_RECYCLER');
        if (ready) {
          selectBattery(ready.id);
        } else if (bData.batteries.length > 0) {
          selectBattery(bData.batteries[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const selectBattery = async (id) => {
    setSelectedBatteryId(id);
    setErrorMessage('');
    setSuccessResult(null);

    try {
      const [bRes, hRes] = await Promise.all([
        fetch(`http://localhost:5000/api/batteries/${id}`),
        fetch(`http://localhost:5000/api/batteries/${id}/history`)
      ]);
      const bData = await bRes.json();
      const hData = await hRes.json();

      if (bData.success) {
        const b = bData.battery;
        setSelectedBattery(b);

        // Auto calculate reasonable material yields based on chemistry
        if (b.chemistry === 'LEAD_ACID') {
          setLeadKg((b.weightKg * 0.65).toFixed(2));
          setLithiumKg('0');
          setCobaltKg('0');
          setPlasticsKg((b.weightKg * 0.15).toFixed(2));
        } else if (b.chemistry === 'LITHIUM_ION') {
          setLeadKg('0');
          setLithiumKg((b.weightKg * 0.08).toFixed(2));
          setCobaltKg((b.weightKg * 0.05).toFixed(2));
          setPlasticsKg((b.weightKg * 0.14).toFixed(2));
        }
      }
      if (hData.success) setHistory(hData.history);
    } catch (err) {
      console.error(err);
    }
  };

  const getEffectiveRecyclerId = () => {
    return isUnauthorizedSim ? 'ILLEGAL-UNLICENSED-SCRAPPER' : selectedRecyclerId;
  };

  // 1. Receive Custody
  const handleReceiveBattery = async () => {
    if (!selectedBatteryId) return;
    setLoading(true);
    setErrorMessage('');
    setSuccessResult(null);

    const recId = getEffectiveRecyclerId();

    try {
      const res = await fetch('http://localhost:5000/api/batteries/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batteryId: selectedBatteryId,
          recyclerId: recId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to receive battery on Fabric ledger');
      }

      selectBattery(selectedBatteryId);
      fetchInitialData();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Recycle & Mint EPR Certificate
  const handleRecycleBattery = async () => {
    if (!selectedBatteryId) return;
    setLoading(true);
    setErrorMessage('');
    setSuccessResult(null);

    const recId = getEffectiveRecyclerId();

    const recovered = {
      recoveredLeadKg: parseFloat(leadKg),
      recoveredLithiumKg: parseFloat(lithiumKg),
      recoveredCobaltKg: parseFloat(cobaltKg),
      recoveredPlasticsKg: parseFloat(plasticsKg),
      recoveryRatePct: parseFloat(recoveryRatePct)
    };

    try {
      const res = await fetch('http://localhost:5000/api/batteries/recycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batteryId: selectedBatteryId,
          recyclerId: recId,
          recoveredMaterials: recovered
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to recycle battery on Fabric ledger');
      }

      setSuccessResult(data);
      selectBattery(selectedBatteryId);
      fetchInitialData();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentRecycler = recyclers.find(r => r.recyclerId === selectedRecyclerId);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Recycle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Authorized Recycler & EPR Minting Station</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  CPCB BWMR Registered
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Process spent batteries, record material recovery yields, and mint verifiable EPR Certificates anchored cryptographically on Hyperledger Fabric.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recycler Authorization Selection Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              CPCB Recycler Authorization Check
            </h3>
          </div>

          {/* Negative test toggle */}
          <button
            type="button"
            onClick={() => setIsUnauthorizedSim(!isUnauthorizedSim)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
              isUnauthorizedSim
                ? 'bg-rose-950/40 border-rose-500 text-rose-300 ring-1 ring-rose-500/50'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isUnauthorizedSim ? '⚠️ Simulating Unauthorized Scrapper' : 'Test Unauthorized Entity'}
          </button>
        </div>

        {isUnauthorizedSim ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <div className="font-bold">Simulating Unauthorized Informal Recycler (`ILLEGAL-UNLICENSED-SCRAPPER`)</div>
              <p className="text-[11px] text-rose-400/80 mt-0.5">
                Submitting custody or recycling transactions will trigger smart contract validation failure because this ID does not exist in the CPCB Authorized Recyclers Registry.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recyclers.map((r) => {
              const isSelected = selectedRecyclerId === r.recyclerId;
              return (
                <div
                  key={r.recyclerId}
                  onClick={() => setSelectedRecyclerId(r.recyclerId)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs truncate">{r.companyName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                      {r.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400">{r.recyclerId}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{r.state}</span>
                    <span className="font-mono">{r.annualCapacityTons} T/yr</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 truncate">
                    Permitted: {r.permittedChemistries.join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Processing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Battery Queue & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Recycle className="w-4 h-4 text-emerald-400" />
              <span>Incoming Battery Queue for Processing</span>
            </h3>

            {/* Battery Selector */}
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
              {collectedBatteries.map((b) => (
                <div
                  key={b.id}
                  onClick={() => selectBattery(b.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer text-xs font-mono transition-all flex items-center justify-between ${
                    selectedBatteryId === b.id
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-emerald-400 flex items-center space-x-2">
                      <span>{b.id}</span>
                      {b.eprCertificateId && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-sans">
                          EPR Certified
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                      {b.model} ({b.chemistry}, {b.weightKg} kg)
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    b.status === 'EPR_CERTIFIED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : b.status === 'COLLECTED'
                      ? 'bg-purple-500/20 text-purple-400'
                      : b.status === 'RECEIVED_BY_RECYCLER'
                      ? 'bg-teal-500/20 text-teal-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Stage Actions */}
            {selectedBattery && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Target Battery:</span>
                  <span className="text-white font-bold">{selectedBattery.id}</span>
                </div>

                {/* Step A: Receive Custody */}
                {selectedBattery.status === 'COLLECTED' && (
                  <div>
                    <button
                      onClick={handleReceiveBattery}
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-600/20"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>Step 4A: Accept Custody at Recycling Facility</span>
                    </button>
                  </div>
                )}

                {/* Step B: Material Recovery & Recycle */}
                {(selectedBattery.status === 'RECEIVED_BY_RECYCLER' || selectedBattery.status === 'COLLECTED') && (
                  <div className="space-y-4 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Material Recovery Yields (kg):
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        Recovery Rate: {recoveryRatePct}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                          Lead (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={leadKg}
                          onChange={(e) => setLeadKg(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                          Lithium (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={lithiumKg}
                          onChange={(e) => setLithiumKg(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                          Cobalt (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={cobaltKg}
                          onChange={(e) => setCobaltKg(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                          Plastics (kg)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={plasticsKg}
                          onChange={(e) => setPlasticsKg(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleRecycleBattery}
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                      <span>Recycle Battery & Mint EPR Certificate on Blockchain</span>
                    </button>
                  </div>
                )}

                {/* DOUBLE RECYCLING PREVENTION DEMO BUTTON */}
                {(selectedBattery.status === 'RECYCLED' || selectedBattery.status === 'EPR_CERTIFIED') && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>This battery has already been recycled and issued an EPR Certificate.</span>
                    </div>

                    <button
                      onClick={handleRecycleBattery}
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/60 font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
                    >
                      <Lock className="w-4 h-4 text-rose-400" />
                      <span>Test Smart Contract: Attempt Double Recycling (Expect Rejection)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2 animate-fade-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="font-mono text-[11px] leading-relaxed break-words">{errorMessage}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Issued Certificate Display (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {successResult ? (
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in ring-1 ring-emerald-500/30">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Award className="w-5 h-5" />
                <span>EPR Certificate Minted on Fabric!</span>
              </div>

              {/* QR display */}
              <div className="bg-white p-4 rounded-2xl max-w-[220px] mx-auto shadow-inner flex flex-col items-center">
                <img src={successResult.certificateQR} alt="EPR QR" className="w-full h-auto object-contain" />
                <span className="text-[9px] font-mono text-slate-800 font-bold mt-2">
                  {successResult.certificate.certificateId}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                  <span>Certificate ID:</span>
                  <span className="text-emerald-400 font-bold">{successResult.certificate.certificateId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                  <span>EPR Credit Points:</span>
                  <span className="text-amber-400 font-bold">{successResult.certificate.eprCreditPoints} pts</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
                  <span>Fabric Block:</span>
                  <span className="text-blue-400">#{successResult.blockNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400 text-[10px]">
                  <span>TxID:</span>
                  <span className="text-slate-300 truncate max-w-[150px]">{successResult.txId}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[9px] uppercase block">Cryptographic Seal:</span>
                  <span className="text-emerald-400 font-mono text-[9px] break-all">
                    {successResult.certificate.cryptographicSeal}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setModalData({
                    certificateId: successResult.certificate.certificateId,
                    qrCode: successResult.certificateQR,
                    batteryId: successResult.certificate.batteryId,
                    recyclerId: successResult.certificate.recyclerId,
                    txId: successResult.txId
                  })}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors border border-slate-700 flex items-center justify-center space-x-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>View Seal</span>
                </button>
                <a
                  href={successResult.certificateQR}
                  download={`${successResult.certificate.certificateId}-seal.png`}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Seal</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <Award className="w-10 h-10 mx-auto text-slate-600" />
              <h4 className="text-sm font-semibold text-slate-300">
                EPR Certificate Generator
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Once a battery is recycled by an authorized facility, its cryptographic EPR Certificate will appear here with an immutable CPCB seal.
              </p>
            </div>
          )}

          {/* Recycler CPCB Details Badge */}
          {currentRecycler && !isUnauthorizedSim && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Active Facility Accreditation</span>
              </h4>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="text-slate-300 font-sans font-bold">{currentRecycler.companyName}</div>
                <div className="text-slate-400 text-[11px]">Auth: {currentRecycler.cpcbAuthNumber}</div>
                <div className="text-emerald-400 text-[11px]">Valid Thru: {currentRecycler.authExpiry}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <QRModal
        isOpen={Boolean(modalData)}
        onClose={() => setModalData(null)}
        data={modalData}
      />
    </div>
  );
}
