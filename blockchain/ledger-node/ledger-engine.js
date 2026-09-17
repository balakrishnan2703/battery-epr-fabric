'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BatteryEPRContract = require('../chaincode/lib/battery-contract');

/**
 * Hyperledger Fabric Ledger Engine
 * Implements Fabric Channel, Cryptographic Block Ordering, World State, and Key History DB.
 * The append-only block ledger file is the SOLE source of truth.
 */
class FabricLedgerEngine {
  constructor(options = {}) {
    this.channelId = options.channelId || 'battery-channel';
    this.chaincodeId = options.chaincodeId || 'battery-epr';
    this.blocksFilePath = options.blocksFilePath || path.join(__dirname, 'fabric-blocks.json');

    this.blocks = [];
    this.worldState = new Map(); // key -> Buffer
    this.keyHistory = new Map(); // key -> array of { txId, timestamp, isDelete, value, blockNumber }
    this.contract = new BatteryEPRContract();

    this._initializeLedger();
  }

  _sha256(data) {
    return crypto.createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
  }

  _initializeLedger() {
    if (fs.existsSync(this.blocksFilePath)) {
      try {
        const raw = fs.readFileSync(this.blocksFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[FabricLedger] Loading ${parsed.length} blocks from ledger block store: ${this.blocksFilePath}`);
          this.blocks = parsed;
          this._rebuildStateFromBlocks();
          return;
        }
      } catch (err) {
        console.error('[FabricLedger] Error reading block store, recreating genesis block:', err);
      }
    }

    // Create Genesis Block (Block 0)
    console.log('[FabricLedger] Creating Genesis Block for channel: ' + this.channelId);
    const genesisBlock = {
      blockNumber: 0,
      channelId: this.channelId,
      previousBlockHash: '0000000000000000000000000000000000000000000000000000000000000000',
      dataHash: this._sha256({ type: 'CONFIG_GENESIS', channel: this.channelId, orgs: ['Org1MSP', 'OrdererMSP'] }),
      blockHash: '',
      timestamp: new Date().toISOString(),
      transactions: [],
      metadata: {
        creatorMsp: 'OrdererMSP',
        signature: this._sha256('GENESIS_ORDERER_SIGNATURE_' + this.channelId)
      }
    };
    genesisBlock.blockHash = this._sha256(`${genesisBlock.blockNumber}|${genesisBlock.previousBlockHash}|${genesisBlock.dataHash}`);
    this.blocks.push(genesisBlock);
    this._persistBlocks();

    // Execute InitLedger in Block 1
    this.submitTransaction('InitLedger', []).catch(err => {
      console.error('[FabricLedger] Failed to run InitLedger:', err);
    });
  }

  _rebuildStateFromBlocks() {
    this.worldState.clear();
    this.keyHistory.clear();

    for (const block of this.blocks) {
      if (!block.transactions) continue;
      for (const tx of block.transactions) {
        if (tx.rwSet && tx.rwSet.writes) {
          for (const w of tx.rwSet.writes) {
            const buf = Buffer.from(w.value, 'utf8');
            if (w.isDelete) {
              this.worldState.delete(w.key);
            } else {
              this.worldState.set(w.key, buf);
            }

            if (!this.keyHistory.has(w.key)) {
              this.keyHistory.set(w.key, []);
            }
            this.keyHistory.get(w.key).push({
              txId: tx.txId,
              timestamp: tx.timestamp,
              isDelete: w.isDelete || false,
              value: w.isDelete ? null : buf,
              blockNumber: block.blockNumber
            });
          }
        }
      }
    }
  }

  _persistBlocks() {
    fs.writeFileSync(this.blocksFilePath, JSON.stringify(this.blocks, null, 2), 'utf8');
  }

  _createContext(txId, isReadWrite = true) {
    const reads = [];
    const writes = [];
    const events = [];

    const stub = {
      getTxID: () => txId,
      getTxTimestamp: () => ({ seconds: Math.floor(Date.now() / 1000), nanos: 0 }),

      getState: async (key) => {
        const val = this.worldState.get(key);
        reads.push({ key, version: { blockNum: this.blocks.length - 1 } });
        return val ? Buffer.from(val) : Buffer.from('');
      },

      putState: async (key, value) => {
        if (!isReadWrite) {
          throw new Error('EVALUATE_MODE_CANNOT_WRITE: Evaluate transactions are read-only');
        }
        const strVal = Buffer.isBuffer(value) ? value.toString('utf8') : (typeof value === 'string' ? value : JSON.stringify(value));
        writes.push({ key, value: strVal, isDelete: false });
      },

      deleteState: async (key) => {
        if (!isReadWrite) {
          throw new Error('EVALUATE_MODE_CANNOT_WRITE: Evaluate transactions are read-only');
        }
        writes.push({ key, value: '', isDelete: true });
      },

      getStateByRange: async (startKey, endKey) => {
        const items = [];
        for (const [key, val] of this.worldState.entries()) {
          if (key >= startKey && (endKey === '' || key <= endKey)) {
            items.push({ key, value: val });
          }
        }
        items.sort((a, b) => a.key.localeCompare(b.key));
        let idx = 0;
        return {
          next: async () => {
            if (idx < items.length) {
              const item = items[idx++];
              return { value: item, done: false };
            }
            return { value: null, done: true };
          },
          close: async () => {}
        };
      },

      getHistoryForKey: async (key) => {
        const historyList = (this.keyHistory.get(key) || []).slice();
        let idx = 0;
        return {
          next: async () => {
            if (idx < historyList.length) {
              const rec = historyList[idx++];
              return { value: rec, done: false };
            }
            return { value: null, done: true };
          },
          close: async () => {}
        };
      },

      setEvent: (name, payload) => {
        events.push({
          eventName: name,
          payload: Buffer.isBuffer(payload) ? payload.toString('utf8') : payload
        });
      }
    };

    return {
      ctx: { stub },
      reads,
      writes,
      events
    };
  }

  /**
   * Evaluates transaction (read-only query on ledger state)
   */
  async evaluateTransaction(functionName, args = []) {
    const txId = `TX-QUERY-${Date.now()}`;
    const { ctx } = this._createContext(txId, false);

    if (typeof this.contract[functionName] !== 'function') {
      throw new Error(`FABRIC_ERROR: Contract function '${functionName}' does not exist on chaincode '${this.chaincodeId}'`);
    }

    const result = await this.contract[functionName](ctx, ...args);
    return result;
  }

  /**
   * Submits transaction to Fabric ledger:
   * 1. Endorsement: Contract executes against current world state
   * 2. Ordering: Transaction is packaged into a new cryptographic Fabric Block
   * 3. Commit: State updates applied to World State and appended to ledger
   */
  async submitTransaction(functionName, args = []) {
    const txId = `TX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();
    const { ctx, reads, writes, events } = this._createContext(txId, true);

    if (typeof this.contract[functionName] !== 'function') {
      throw new Error(`FABRIC_ERROR: Contract function '${functionName}' does not exist on chaincode '${this.chaincodeId}'`);
    }

    // 1. Endorsement Execution
    const result = await this.contract[functionName](ctx, ...args);

    // 2. Apply writes to World State & Key History
    const blockNum = this.blocks.length;
    for (const w of writes) {
      const buf = Buffer.from(w.value, 'utf8');
      if (w.isDelete) {
        this.worldState.delete(w.key);
      } else {
        this.worldState.set(w.key, buf);
      }

      if (!this.keyHistory.has(w.key)) {
        this.keyHistory.set(w.key, []);
      }
      this.keyHistory.get(w.key).push({
        txId,
        timestamp: now,
        isDelete: w.isDelete,
        value: w.isDelete ? null : buf,
        blockNumber: blockNum
      });
    }

    // 3. Create Fabric Block
    const prevBlock = this.blocks[this.blocks.length - 1];
    const txRecord = {
      txId,
      channelId: this.channelId,
      chaincodeId: this.chaincodeId,
      functionName,
      args,
      rwSet: { reads, writes },
      events,
      status: 200,
      timestamp: now,
      endorserMsp: 'Org1MSP',
      endorsementSignature: this._sha256(`ENDORSE_${txId}_Org1MSP`)
    };

    const dataHash = this._sha256([txRecord]);
    const blockHash = this._sha256(`${blockNum}|${prevBlock.blockHash}|${dataHash}`);

    const newBlock = {
      blockNumber: blockNum,
      channelId: this.channelId,
      previousBlockHash: prevBlock.blockHash,
      dataHash,
      blockHash,
      timestamp: now,
      transactions: [txRecord],
      metadata: {
        blockCreator: 'OrdererMSP',
        ordererSignature: this._sha256(`ORDERER_SIG_${blockNum}_${blockHash}`)
      }
    };

    this.blocks.push(newBlock);
    this._persistBlocks();

    console.log(`[FabricLedger] Committed Block #${newBlock.blockNumber} | TxID: ${txId} | Function: ${functionName} | Hash: ${blockHash.substring(0, 16)}...`);

    return {
      result,
      txId,
      blockNumber: newBlock.blockNumber,
      blockHash: newBlock.blockHash,
      events
    };
  }

  getBlocks(limit = 50) {
    return this.blocks.slice(-limit).reverse();
  }

  getStatus() {
    return {
      channelId: this.channelId,
      chaincodeId: this.chaincodeId,
      blockHeight: this.blocks.length,
      currentBlockHash: this.blocks[this.blocks.length - 1].blockHash,
      worldStateKeys: this.worldState.size,
      connectedPeers: ['peer0.org1.example.com'],
      orderer: 'orderer.example.com',
      mspId: 'Org1MSP',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = FabricLedgerEngine;
