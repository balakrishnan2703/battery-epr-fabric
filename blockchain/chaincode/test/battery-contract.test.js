'use strict';

const assert = require('assert');
const BatteryEPRContract = require('../lib/battery-contract');

/**
 * High-fidelity Hyperledger Fabric ChaincodeStub Mock
 * Faithfully mirrors Fabric's State DB, History DB, and Event emitter
 */
class MockChaincodeStub {
  constructor() {
    this.state = new Map();
    this.history = new Map(); // key -> array of { txId, timestamp, isDelete, value }
    this.events = new Map();
    this.currentTxId = 'TX-INIT-001';
  }

  setTxId(txId) {
    this.currentTxId = txId;
  }

  getTxID() {
    return this.currentTxId;
  }

  getTxTimestamp() {
    return { seconds: Math.floor(Date.now() / 1000), nanos: 0 };
  }

  async putState(key, value) {
    const buf = Buffer.isBuffer(value) ? value : Buffer.from(value);
    this.state.set(key, buf);

    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    this.history.get(key).push({
      txId: this.currentTxId,
      timestamp: new Date().toISOString(),
      isDelete: false,
      value: buf
    });
  }

  async getState(key) {
    return this.state.get(key) || Buffer.from('');
  }

  async deleteState(key) {
    this.state.delete(key);
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    this.history.get(key).push({
      txId: this.currentTxId,
      timestamp: new Date().toISOString(),
      isDelete: true,
      value: null
    });
  }

  async getStateByRange(startKey, endKey) {
    const items = [];
    for (const [key, val] of this.state.entries()) {
      if (key >= startKey && (endKey === '' || key <= endKey)) {
        items.push({ key, value: val });
      }
    }
    items.sort((a, b) => a.key.localeCompare(b.key));

    let index = 0;
    return {
      next: async () => {
        if (index < items.length) {
          const item = items[index++];
          return { value: item, done: false };
        }
        return { value: null, done: true };
      },
      close: async () => {}
    };
  }

  async getHistoryForKey(key) {
    const records = (this.history.get(key) || []).slice();
    let index = 0;
    return {
      next: async () => {
        if (index < records.length) {
          const rec = records[index++];
          return { value: rec, done: false };
        }
        return { value: null, done: true };
      },
      close: async () => {}
    };
  }

  setEvent(name, payload) {
    this.events.set(name, payload);
  }
}

class MockContext {
  constructor() {
    this.stub = new MockChaincodeStub();
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING HYPERLEDGER FABRIC BATTERY EPR CHAINCODE TESTS');
  console.log('================================================================\n');

  const contract = new BatteryEPRContract();
  const ctx = new MockContext();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. InitLedger
  await test('1. InitLedger seeds CPCB Authorized Recyclers and initial assets', async () => {
    ctx.stub.setTxId('TX-001-INIT');
    await contract.InitLedger(ctx);

    const recBytes = await ctx.stub.getState('RECYCLER_REC-CPCB-KAR-042');
    assert(recBytes.length > 0, 'Recycler REC-CPCB-KAR-042 should exist');
    const recycler = JSON.parse(recBytes.toString());
    assert.strictEqual(recycler.status, 'AUTHORIZED');
    assert.strictEqual(recycler.state, 'Karnataka');
  });

  // 2. RegisterBattery
  const batteryId = 'BAT-IND-2026-TEST01';
  await test('2. RegisterBattery generates unique battery on ledger', async () => {
    ctx.stub.setTxId('TX-002-REGISTER');
    const resStr = await contract.RegisterBattery(
      ctx,
      batteryId,
      'LITHIUM_ION',
      'Exide EcoLife 48V 100Ah',
      '32.5',
      'MFG-EXIDE-IND',
      'CPCB-EPR-BWM-2024-EX99'
    );
    const battery = JSON.parse(resStr);
    assert.strictEqual(battery.id, batteryId);
    assert.strictEqual(battery.status, 'MANUFACTURED');
    assert.strictEqual(battery.weightKg, 32.5);
  });

  // 3. Duplicate Registration Rejection
  await test('3. Registering duplicate battery ID throws error', async () => {
    let errorThrown = false;
    try {
      await contract.RegisterBattery(
        ctx,
        batteryId,
        'LITHIUM_ION',
        'Duplicate Battery',
        '20',
        'MFG-OTHER',
        'CPCB-OTHER'
      );
    } catch (err) {
      errorThrown = true;
      assert(err.message.includes('BATTERY_ALREADY_EXISTS'));
    }
    assert(errorThrown, 'Should have thrown error on duplicate registration');
  });

  // 4. Transfer to Consumer
  await test('4. TransferToConsumer updates status to IN_USE', async () => {
    ctx.stub.setTxId('TX-003-TRANSFER');
    const resStr = await contract.TransferToConsumer(ctx, batteryId, 'Karnataka / Bengaluru');
    const battery = JSON.parse(resStr);
    assert.strictEqual(battery.status, 'IN_USE');
    assert.strictEqual(battery.consumerRegion, 'Karnataka / Bengaluru');
  });

  // 5. Informal Collector Register Collection
  await test('5. CollectBattery updates status to COLLECTED with collector metadata', async () => {
    ctx.stub.setTxId('TX-004-COLLECT');
    const resStr = await contract.CollectBattery(
      ctx,
      batteryId,
      'COLL-INFOR-BLR-09',
      'Shivajinagar Scrap Market, Bengaluru',
      'DEPLETED_END_OF_LIFE'
    );
    const battery = JSON.parse(resStr);
    assert.strictEqual(battery.status, 'COLLECTED');
    assert.strictEqual(battery.collectorId, 'COLL-INFOR-BLR-09');
  });

  // 6. Recycler Authorization Check (Negative Test: Unauthorized Recycler Rejected)
  await test('6. Recycler authorization check REJECTS unauthorized recycler ID', async () => {
    ctx.stub.setTxId('TX-005-RECV-FAIL');
    let errorThrown = false;
    try {
      await contract.ReceiveBattery(ctx, batteryId, 'FAKE-UNAUTHORIZED-RECYCLER-999');
    } catch (err) {
      errorThrown = true;
      assert(err.message.includes('UNAUTHORIZED_RECYCLER'));
    }
    assert(errorThrown, 'Unauthorized recycler should have been rejected');
  });

  // 7. Recycler Receives Custody
  await test('7. Authorized Recycler receives physical custody', async () => {
    ctx.stub.setTxId('TX-006-RECEIVE');
    const resStr = await contract.ReceiveBattery(ctx, batteryId, 'REC-CPCB-KAR-042');
    const battery = JSON.parse(resStr);
    assert(battery.status === 'AT_RECYCLER' || battery.status === 'RECEIVED_BY_RECYCLER');
    assert.strictEqual(battery.recyclerId, 'REC-CPCB-KAR-042');
  });

  // 8. Recycle Battery and Generate EPR Certificate
  let issuedCertId = '';
  await test('8. RecycleBattery verifies auth, marks recycled, and mints EPR Certificate', async () => {
    ctx.stub.setTxId('TX-007-RECYCLE');
    const recoveryData = {
      recoveredLithiumKg: 2.6,
      recoveredCobaltKg: 1.6,
      recoveredPlasticsKg: 4.8,
      recoveryRatePct: 91.0
    };
    const resStr = await contract.RecycleBattery(ctx, batteryId, 'REC-CPCB-KAR-042', JSON.stringify(recoveryData));
    const result = JSON.parse(resStr);

    assert.strictEqual(result.battery.status, 'EPR_CERTIFIED');
    assert(result.battery.eprCertificateId.startsWith('EPR-CERT-IND-'), 'Valid cert ID prefix');
    assert(result.certificate, 'Certificate object must be present');
    assert.strictEqual(result.certificate.batteryId, batteryId);
    assert.strictEqual(result.certificate.complianceStatus, 'VALID_ISSUED');
    assert(result.certificate.cryptographicSeal.length === 64, 'SHA-256 seal length');

    issuedCertId = result.certificate.certificateId;
  });

  // 9. CRITICAL: Double-Recycling Prevention
  await test('9. Double-Recycling Prevention: Attempting to recycle the same battery twice is BLOCKED', async () => {
    ctx.stub.setTxId('TX-008-DOUBLE-RECYCLE-ATTEMPT');
    let errorThrown = false;
    try {
      await contract.RecycleBattery(ctx, batteryId, 'REC-CPCB-KAR-042', '{}');
    } catch (err) {
      errorThrown = true;
      assert(err.message.includes('DOUBLE_RECYCLING_PREVENTED'));
    }
    assert(errorThrown, 'Smart contract must strictly prevent double-recycling of same battery');
  });

  // 10. CRITICAL: Regulator Verifies Authentic EPR Certificate
  await test('10. Regulator verifies authentic EPR Certificate with cryptographic ledger proof', async () => {
    ctx.stub.setTxId('TX-009-VERIFY-VALID');
    const resStr = await contract.VerifyEPRCertificate(ctx, issuedCertId);
    const verification = JSON.parse(resStr);

    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.certificate.certificateId, issuedCertId);
    assert.strictEqual(verification.linkedBattery.id, batteryId);
  });

  // 11. CRITICAL: Fake/Invalid Certificate ID Rejected
  await test('11. Regulator rejects fake or non-existent certificate ID with fraud alert', async () => {
    ctx.stub.setTxId('TX-010-VERIFY-FAKE');
    const fakeCertId = 'EPR-CERT-FAKE-FORGED-9999';
    const resStr = await contract.VerifyEPRCertificate(ctx, fakeCertId);
    const verification = JSON.parse(resStr);

    assert.strictEqual(verification.valid, false);
    assert(verification.error.includes('FRAUD_ALERT'));
  });

  // 12. CRITICAL: Display Transaction History for Battery (GetHistoryForKey)
  await test('12. GetBatteryHistory retrieves full chronological Fabric ledger transaction history', async () => {
    const historyStr = await contract.GetBatteryHistory(ctx, batteryId);
    const history = JSON.parse(historyStr);

    assert(history.length >= 5, `Expected at least 5 state transitions, found ${history.length}`);
    console.log(`    Chronological Ledger History for ${batteryId}:`);
    history.forEach((h, idx) => {
      console.log(`    [#${idx + 1}] TxID: ${h.txId} | Status: ${h.value.status} | Timestamp: ${h.timestamp}`);
    });

    assert.strictEqual(history[0].value.status, 'MANUFACTURED');
    assert.strictEqual(history[history.length - 1].value.status, 'EPR_CERTIFIED');
  });

  // 13. CRITICAL: A certificate cannot be minted more than once for one battery
  await test('13. Duplicate EPR certificate generation is BLOCKED', async () => {
    let errorThrown = false;
    try {
      await contract.GenerateEPRCertificate(ctx, batteryId, 'REC-CPCB-KAR-042', '{}');
    } catch (err) {
      errorThrown = true;
      assert(err.message.includes('DUPLICATE_EPR_PREVENTED'));
    }
    assert(errorThrown, 'Smart contract must strictly prevent duplicate EPR certificates');
  });

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
