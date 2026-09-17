import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  QrCode, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Download, 
  Copy, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import QRModal from '../components/QRModal';

export default function ManufacturerPortal({ onBatteryCreated }) {
  const [chemistry, setChemistry] = useState('LITHIUM_ION');
  const [model, setModel] = useState('Exide EV-Pro 48V 100Ah LFP Pack');
  const [weightKg, setWeightKg] = useState('34.5');
  const [manufacturerId, setManufacturerId] = useState('MFG-EXIDE-IND-KOL');
  const [producerEprNo, setProducerEprNo] = useState('CPCB-EPR-BWM-2024-EX992');
  const [customId, setCustomId] = useState('');

  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [batteries, setBatteries] = useState([]);
  const [modalData, setModalData] = useState(null);

  const presets = [
    {
      label: '⚡ Lithium-Ion EV Pack (48V 100Ah)',
      chemistry: 'LITHIUM_ION',
      model: 'Exide EV-Pro 48V 100Ah LFP Pack',
      weightKg: '34.5',
      mfgId: 'MFG-EXIDE-IND-KOL',
      eprNo: 'CPCB-EPR-BWM-2024-EX992'
    },
    {
      label: '🚗 Two-Wheeler Swappable Cell (60V 30Ah)',
      chemistry: 'LITHIUM_ION',
      model: 'Ola S1 Swappable Battery Pack',
      weightKg: '14.2',
      mfgId: 'MFG-OLA-ELECTRIC-TN',
      eprNo: 'CPCB-EPR-BWM-2023-OLA412'
    },
    {
      label: '🔋 Lead-Acid Inverter / Solar (12V 150Ah)',
      chemistry: 'LEAD_ACID',
      model: 'Amaron Current Tall Tubular 150Ah',
      weightKg: '48.0',
      mfgId: 'MFG-AMARA-RAJA-AP',
      eprNo: 'CPCB-EPR-BWM-2024-AMR108'
    }
  ];

  const fetchBatteries = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/batteries');
      const json = await res.json();
      if (json.batteries) {
        setBatteries(json.batteries);
      }
    } catch (err) {
      console.error('Error fetching batteries:', err);
    }
  };

  useEffect(() => {
    fetchBatteries();
  }, []);

  const handleApplyPreset = (p) => {
    setChemistry(p.chemistry);
    setModel(p.model);
    setWeightKg(p.weightKg);
    setManufacturerId(p.mfgId);
    setProducerEprNo(p.eprNo);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessResult(null);

    try {
      const res = await fetch('http://localhost:5000/api/batteries/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: customId.trim() || undefined,
          chemistry,
          model,
          weightKg: parseFloat(weightKg),
          manufacturerId,
          producerEprNo
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register battery on Fabric ledger');
      }

      setSuccessResult(data);
      fetchBatteries();
      if (onBatteryCreated) onBatteryCreated(data.battery);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Factory className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Manufacturer Production & Digital Passport Portal</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  CPCB Producer Registration
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Mint unique battery serial identities and generate tamper-proof QR code passports anchored on Hyperledger Fabric.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-slate-300">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Fabric Chaincode: battery-epr</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-blue-400" />
                <span>Register New Battery Batch / Unit</span>
              </h3>
              <span className="text-[11px] text-slate-400">Step 1 of EPR Lifecycle</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Quick Fill Real-World Presets:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2.5 rounded-xl text-left bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 text-xs text-slate-300 hover:text-white transition-all hover:border-blue-500/40"
                  >
                    <div className="font-semibold truncate">{p.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.weightKg} kg</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Chemistry Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={chemistry}
                    onChange={(e) => setChemistry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="LITHIUM_ION">Lithium-Ion (NMC/LFP)</option>
                    <option value="LEAD_ACID">Lead-Acid (Flooded/VRLA)</option>
                    <option value="NICKEL_CADMIUM">Nickel-Cadmium (NiCad)</option>
                    <option value="OTHER">Other Chemistry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Gross Weight (kg) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder="e.g. 34.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Battery Pack / Cell Model Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. Exide EV-Pro 48V 100Ah LFP Pack"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Manufacturer Entity ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={manufacturerId}
                    onChange={(e) => setManufacturerId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder="e.g. MFG-EXIDE-IND"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CPCB Producer EPR Registration No <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={producerEprNo}
                    onChange={(e) => setProducerEprNo(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder="e.g. CPCB-EPR-BWM-2024-EX99"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Custom Battery Serial ID (Optional)
                </label>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  placeholder="Leave empty for auto-generated BAT-IND-2026-XXXXXX"
                />
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting to Hyperledger Fabric...</span>
                  </>
                ) : (
                  <>
                    <Factory className="w-4 h-4" />
                    <span>Mint Battery ID & QR Code on Ledger</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {successResult ? (
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-5 animate-fade-in ring-1 ring-emerald-500/30">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-5 h-5" />
                <span>Battery Registered on Fabric Ledger</span>
              </div>

              <div className="bg-white p-4 rounded-2xl max-w-[240px] mx-auto shadow-inner flex flex-col items-center">
                <img src={successResult.qrCode} alt="Battery QR" className="w-full h-auto object-contain" />
                <span className="text-[10px] font-mono text-slate-800 font-bold mt-2">
                  {successResult.battery.id}
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Battery ID:</span>
                  <span className="text-emerald-400 font-bold">{successResult.battery.id}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Block Height:</span>
                  <span className="text-blue-400">#{successResult.blockNumber}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>TxID:</span>
                  <span className="truncate max-w-[170px] text-slate-300">{successResult.txId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span>Status:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                    {successResult.battery.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setModalData({
                    id: successResult.battery.id,
                    model: successResult.battery.model,
                    chemistry: successResult.battery.chemistry,
                    qrCode: successResult.qrCode,
                    txId: successResult.txId
                  })}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors border border-slate-700 flex items-center justify-center space-x-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>View Sticker</span>
                </button>
                <a
                  href={successResult.qrCode}
                  download={`${successResult.battery.id}-sticker.png`}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">
                Digital Battery Passport Generator
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Fill the form on the left to mint a unique identity on the Fabric blockchain. The QR code sticker will appear here instantly.
              </p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-blue-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CPCB Mandate Note</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every battery sold in India must bear a scannable QR code carrying the producer’s EPR registration and battery material composition under Battery Waste Management Rules 2022.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Fabric Ledger Battery Registry ({batteries.length})
            </h3>
            <p className="text-xs text-slate-400">
              Batteries minted by registered producers on channel `mychannel`
            </p>
          </div>
          <button
            onClick={fetchBatteries}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs border border-slate-700 flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Battery ID</th>
                <th className="py-3 px-4">Model & Chemistry</th>
                <th className="py-3 px-4">Weight</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4">Ledger Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {batteries.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-emerald-400">{b.id}</td>
                  <td className="py-3 px-4 font-sans">
                    <div className="text-white font-medium">{b.model}</div>
                    <div className="text-[11px] text-amber-400">{b.chemistry}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{b.weightKg} kg</td>
                  <td className="py-3 px-4 text-slate-400">{b.manufacturerId}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={async () => {
                        const res = await fetch(`http://localhost:5000/api/batteries/${b.id}`);
                        const d = await res.json();
                        setModalData({ ...b, qrCode: d.qrCode });
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700 inline-flex items-center space-x-1 font-sans"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>Sticker</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
