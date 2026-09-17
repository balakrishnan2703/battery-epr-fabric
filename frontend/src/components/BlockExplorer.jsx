import React, { useState, useEffect } from 'react';
import { X, Layers, Box, Clock, RefreshCw } from 'lucide-react';

export default function BlockExplorer({ isOpen, onClose }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [error, setError] = useState(null);

  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/regulator/blocks?limit=30');
      const json = await res.json();
      if (json.blocks) {
        setBlocks(json.blocks);
        if (json.blocks.length > 0) {
          setSelectedBlock(json.blocks[0]);
        }
      } else {
        setError(json.error || 'Fabric blocks are unavailable.');
      }
    } catch (err) {
      console.error('Failed to fetch blocks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlocks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Hyperledger Fabric Ledger Explorer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono">
                  mychannel
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live cryptographic block store & world state transition log
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchBlocks}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Refresh Blocks"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content: Left list, Right inspector */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          {/* Blocks List */}
          <div className="border-r border-slate-800 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-950/30">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
              <span>Blocks Feed</span>
              <span>{blocks.length} Blocks</span>
            </div>

            {blocks.map((block) => {
              const isSelected = selectedBlock?.blockNumber === block.blockNumber;
              const txCount = block.transactions ? block.transactions.length : 0;

              return (
                <div
                  key={block.blockNumber}
                  onClick={() => setSelectedBlock(block)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/60 shadow-md text-white'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <Box className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono font-bold text-sm">
                        Block #{block.blockNumber}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-950 border border-slate-800 text-slate-400">
                      `${txCount} tx`
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 truncate" title={block.blockHash}>
                    Hash: {block.blockHash ? `${block.blockHash.substring(0, 16)}...` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(block.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Block Inspector */}
          <div className="col-span-2 overflow-y-auto custom-scrollbar p-6 bg-slate-900/50">
            {selectedBlock ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold">
                      #{selectedBlock.blockNumber}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Block #{selectedBlock.blockNumber} Inspector
                      </h3>
                      <p className="text-xs text-slate-400">
                        {new Date(selectedBlock.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Committed on Org1MSP
                  </span>
                </div>

                {/* Hashes Grid */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Current Block Hash (SHA-256):</span>
                    <span className="text-emerald-400 break-all select-all font-semibold">
                      {selectedBlock.blockHash}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Previous Block Hash:</span>
                    <span className="text-slate-300 break-all select-all">
                      {selectedBlock.previousBlockHash}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block">Merkle / Data Hash:</span>
                    <span className="text-slate-400 break-all select-all">
                      {selectedBlock.dataHash}
                    </span>
                  </div>
                </div>

                {/* Transactions Section */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Block Transactions ({selectedBlock.transactions ? selectedBlock.transactions.length : 0})
                  </h4>

                  {selectedBlock.transactions && selectedBlock.transactions.length > 0 ? (
                    <div className="space-y-3">
                      {selectedBlock.transactions.map((tx, idx) => (
                        <div key={tx.txId || idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                            <span className="text-emerald-400 font-bold">Tx #{idx + 1}</span>
                            <span className="text-slate-500 text-[10px]">TxID: {tx.txId || 'Unavailable'}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[10px] uppercase block">Timestamp:</span>
                            <span className="text-slate-300">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Unavailable'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase block">Validation:</span>
                            <span className={tx.validationCode === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                              {tx.validationStatus} ({tx.validationCode})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                      No transactions recorded in this block.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-sm">
                {error || 'No Fabric blocks are currently available.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
