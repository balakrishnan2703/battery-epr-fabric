import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Layers, 
  Award, 
  BarChart3, 
  RefreshCw, 
  Clock, 
  ExternalLink,
  History,
  Building2,
  FileText
} from 'lucide-react';
import LifecycleTimeline from '../components/LifecycleTimeline';

export default function RegulatorPortal({ onOpenExplorer }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(false);

  // Verification Tool State
  const [certInput, setCertInput] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // History Audit State
  const [auditBatteryId, setAuditBatteryId] = useState('');
  const [auditHistory, setAuditHistory] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, certsRes, batsRes] = await Promise.all([
        fetch('http://localhost:5000/api/regulator/dashboard'),
        fetch('http://localhost:5000/api/certificates'),
        fetch('http://localhost:5000/api/batteries')
      ]);

      const dashJson = await dashRes.json();
      const certsJson = await certsRes.json();
      const batsJson = await batsRes.json();

      if (dashJson.success) setDashboardData(dashJson);
      if (certsJson.certificates) setCertificates(certsJson.certificates);
      if (batsJson.batteries) {
        setBatteries(batsJson.batteries);
        if (!auditBatteryId && batsJson.batteries.length > 0) {
          auditBattery(batsJson.batteries[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const verifyCertificate = async (idToVerify) => {
    const certId = idToVerify || certInput.trim();
    if (!certId) return;

    setVerifyLoading(true);
    setVerificationResult(null);

    try {
      const res = await fetch(`http://localhost:5000/api/certificates/${certId}`);
      const data = await res.json();
      setVerificationResult(data);
      setCertInput(certId);
    } catch (err) {
      setVerificationResult({
        valid: false,
        certificateId: certId,
        error: `Network / Gateway Error: ${err.message}`
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const auditBattery = async (idToAudit) => {
    const batId = idToAudit || auditBatteryId.trim();
    if (!batId) return;

    setAuditLoading(true);
    try {
      const [hRes, bRes] = await Promise.all([
        fetch(`http://localhost:5000/api/batteries/${batId}/history`),
        fetch(`http://localhost:5000/api/batteries/${batId}`)
      ]);
      const hData = await hRes.json();
      const bData = await bRes.json();

      setAuditBatteryId(batId);
      setAuditHistory({
        battery: bData.battery,
        history: hData.history || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const metrics = dashboardData?.metrics;
  const netStatus = dashboardData?.networkStatus;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>CPCB National EPR Regulatory Command Center</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                  MoEFCC Oversight
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Central Pollution Control Board national portal for battery waste management compliance, cryptographic certificate verification, and tamper-proof ledger audit.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDashboard}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Ledger</span>
            </button>
            <button
              onClick={onOpenExplorer}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 text-xs font-mono border border-emerald-800/60 flex items-center space-x-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>{netStatus?.latestBlockNumber !== undefined ? `Block #${netStatus.latestBlockNumber}` : 'Blocks unavailable'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Registered</span>
            <div className="text-2xl font-bold text-white font-mono mt-1">{metrics.counts.totalRegistered}</div>
            <span className="text-[10px] text-blue-400 mt-1 block">Producer Mints</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">EPR Certified</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{metrics.counts.eprCertified}</div>
            <span className="text-[10px] text-emerald-500 mt-1 block">Recycled on Ledger</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Compliance Rate</span>
            <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{metrics.complianceRatePct}%</div>
            <span className="text-[10px] text-slate-400 mt-1 block">BWMR 2022 Target</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Gross Weight</span>
            <div className="text-2xl font-bold text-white font-mono mt-1">{metrics.totalGrossWeightKg} <span className="text-xs font-normal">kg</span></div>
            <span className="text-[10px] text-slate-400 mt-1 block">Material Mass</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">EPR Credits</span>
            <div className="text-2xl font-bold text-teal-400 font-mono mt-1">{metrics.totalEprCreditsIssued}</div>
            <span className="text-[10px] text-teal-500 mt-1 block">Points Minted</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Active Recyclers</span>
            <div className="text-2xl font-bold text-purple-400 font-mono mt-1">{metrics.activeRecyclersCount}</div>
            <span className="text-[10px] text-purple-400 mt-1 block">CPCB Authorized</span>
          </div>
        </div>
      )}

      {/* Recovered Materials Bar */}
      {metrics && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>National Strategic Materials Recovered from Circular Recycling (kg)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Ledger Verified Output</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500">Pure Refined Lead</span>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{metrics.materialsRecovered.leadKg} kg</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500">Lithium Carbonate</span>
              <div className="text-lg font-bold text-teal-400 font-mono mt-0.5">{metrics.materialsRecovered.lithiumKg} kg</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500">Cobalt Sulphate</span>
              <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">{metrics.materialsRecovered.cobaltKg} kg</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-500">Polypropylene Plastics</span>
              <div className="text-lg font-bold text-purple-400 font-mono mt-0.5">{metrics.materialsRecovered.plasticsKg} kg</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: EPR CERTIFICATE VERIFIER & FAKE REJECTION DEMO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-rose-400" />
              <span>Tamper-Proof EPR Certificate Verification Tool</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verify cryptographic authenticity of EPR certificates issued by authorized recyclers. Rejects fraudulent or non-existent IDs.
            </p>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center space-x-2">
            {certificates.length > 0 && (
              <button
                onClick={() => verifyCertificate(certificates[0].certificateId)}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-800/60 text-xs font-mono font-semibold"
              >
                Test Valid Certificate
              </button>
            )}
            <button
              onClick={() => verifyCertificate('EPR-CERT-FAKE-FORGED-9999')}
              className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/60 text-xs font-mono font-semibold"
            >
              Test Fake/Counterfeit ID
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              placeholder="Enter EPR Certificate ID (e.g. EPR-CERT-IND-2026-XXXXXX)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          </div>

          <button
            onClick={() => verifyCertificate()}
            disabled={verifyLoading}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            {verifyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Verify on Ledger</span>
          </button>
        </div>

        {/* Verification Result Display */}
        {verificationResult && (
          <div className="animate-fade-in">
            {verificationResult.valid ? (
              /* VALID VERIFICATION CARD */
              <div className="bg-gradient-to-b from-emerald-950/40 to-slate-950 border border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-4 ring-1 ring-emerald-500/30">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
                  <div className="flex items-center space-x-2.5 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                      <h4 className="font-bold text-base text-white">
                        CPCB EPR Certificate Cryptographically Verified
                      </h4>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        Authentic state record on Hyperledger Fabric ledger
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    STATUS: VALID_ISSUED
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-slate-500 uppercase text-[10px]">Certificate Metadata</div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Certificate ID:</span>
                      <span className="text-emerald-400 font-bold">{verificationResult.certificate.certificateId}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">EPR Credit Points:</span>
                      <span className="text-amber-400 font-bold">{verificationResult.certificate.eprCreditPoints}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Issuing Recycler:</span>
                      <span className="text-white font-sans">{verificationResult.certificate.recyclerName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">CPCB Auth Number:</span>
                      <span className="text-slate-300">{verificationResult.certificate.cpcbAuthNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Issued Timestamp:</span>
                      <span className="text-slate-300">{new Date(verificationResult.certificate.issuedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-slate-500 uppercase text-[10px]">Associated Battery Proof</div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Battery ID:</span>
                      <span className="text-blue-400 font-bold">{verificationResult.certificate.batteryId}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Battery Model:</span>
                      <span className="text-slate-200 font-sans truncate max-w-[180px]">{verificationResult.certificate.batteryModel}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Gross Weight:</span>
                      <span className="text-slate-200">{verificationResult.certificate.grossWeightKg} kg</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-900">
                      <span className="text-slate-400">Producer Entity:</span>
                      <span className="text-slate-300">{verificationResult.certificate.producerId}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-slate-500 text-[10px] block">Cryptographic Seal:</span>
                      <span className="text-emerald-400 text-[9px] break-all select-all font-mono">
                        {verificationResult.certificate.cryptographicSeal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* FRAUD ALERT CARD */
              <div className="bg-gradient-to-b from-rose-950/50 to-slate-950 border border-rose-500/60 rounded-2xl p-6 shadow-2xl space-y-4 ring-1 ring-rose-500/40">
                <div className="flex items-center space-x-3 text-rose-400 pb-3 border-b border-rose-500/30">
                  <XCircle className="w-8 h-8 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-base text-rose-200">
                      FRAUD ALERT: INVALID OR COUNTERFEIT EPR CERTIFICATE REJECTED
                    </h4>
                    <span className="text-xs text-rose-400/90 font-mono">
                      Certificate ID: {verificationResult.certificateId}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-900/40 text-xs text-rose-300 space-y-2">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Hyperledger Fabric Verification Failure Reason:</span>
                  </div>
                  <p className="font-mono text-rose-300/90 text-[11px] leading-relaxed">
                    {verificationResult.error}
                  </p>
                </div>

                <div className="text-[11px] text-slate-400">
                  ⚠️ This certificate does not exist in the append-only Fabric ledger block store. Any claim of compliance using this ID is fraudulent under Rule 15 of India Battery Waste Management Rules 2022.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: BATTERY TRANSACTION HISTORY AUDIT (GetHistoryForKey) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <History className="w-5 h-5 text-blue-400" />
              <span>Battery Full Lifecycle Transaction Audit Trail (`GetHistoryForKey`)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Inspect the immutable chronological chain of custody transitions recorded in Fabric blocks.
            </p>
          </div>

          {/* Quick picker chips */}
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            <span className="text-[10px] text-slate-500">Pick:</span>
            {batteries.slice(0, 4).map(b => (
              <button
                key={b.id}
                onClick={() => auditBattery(b.id)}
                className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                  auditBatteryId === b.id
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {b.id}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Input */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={auditBatteryId}
              onChange={(e) => setAuditBatteryId(e.target.value)}
              placeholder="Enter Battery ID to audit (e.g. BAT-IND-2026-XXXXXX)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>

          <button
            onClick={() => auditBattery()}
            disabled={auditLoading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {auditLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
            <span>Audit History</span>
          </button>
        </div>

        {/* History Results */}
        {auditHistory && (
          <div className="space-y-4 animate-fade-in">
            {auditHistory.battery && (
              <LifecycleTimeline battery={auditHistory.battery} history={auditHistory.history} />
            )}

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Fabric Ledger State Modifications ({auditHistory.history.length} Transactions)
                </span>
                <span className="text-[10px] font-mono text-slate-500">Key: BATTERY_{auditBatteryId}</span>
              </div>

              <div className="space-y-3">
                {auditHistory.history.map((rec, idx) => (
                  <div key={rec.txId || idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 font-mono text-xs space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">
                          #{idx + 1}
                        </span>
                        <span className="text-white font-bold">{rec.value?.status || 'STATE_MODIFIED'}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(rec.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-1">
                      <div className="truncate max-w-sm" title={rec.txId}>
                        <span className="text-slate-500">TxID:</span> <span className="text-slate-300">{rec.txId}</span>
                      </div>
                      {rec.blockNumber !== undefined && (
                        <div className="text-blue-400">
                          Block #{rec.blockNumber}
                        </div>
                      )}
                    </div>

                    {rec.value && (
                      <div className="pt-1 text-[10px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                        {rec.value.manufacturerId && <span>Mfg: {rec.value.manufacturerId}</span>}
                        {rec.value.consumerRegion && <span>Region: {rec.value.consumerRegion}</span>}
                        {rec.value.collectorId && <span>Collector: {rec.value.collectorId}</span>}
                        {rec.value.recyclerId && <span>Recycler: {rec.value.recyclerId}</span>}
                        {rec.value.eprCertificateId && <span className="text-emerald-400 font-bold">Cert: {rec.value.eprCertificateId}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
