'use strict';

const http = require('http');
const assert = require('assert');

function fetchHttp(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, text: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function verifyAll() {
  console.log('======================================================================');
  console.log('STARTING LIVE SYSTEM VERIFICATION (ALL PORTS & WORKFLOWS)');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await check('1. Backend API Health Check (http://localhost:5000/health)', async () => {
    const res = await fetchHttp('http://localhost:5000/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'UP');
    assert.strictEqual(res.data.channel, 'battery-channel');
  });

  // 2. Fabric Ledger Status
  await check('2. Hyperledger Fabric Ledger Status (http://localhost:7054/api/fabric/status)', async () => {
    const res = await fetchHttp('http://localhost:7054/api/fabric/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.channelId, 'battery-channel');
    assert.strictEqual(res.data.chaincodeId, 'battery-epr');
    assert(res.data.blockHeight >= 1);
  });

  // 3. Frontend Web Server (Vite port 5173)
  await check('3. Vite Frontend Server is Live (http://localhost:5173/)', async () => {
    const res = await fetchHttp('http://localhost:5173/');
    assert.strictEqual(res.status, 200);
    assert(res.text.includes('<div id="root">') || res.text.includes('<!DOCTYPE html>'));
  });

  // 4. Integrated Frontend Web Server (Port 5000)
  await check('4. Integrated Frontend Server is Live (http://localhost:5000/)', async () => {
    const res = await fetchHttp('http://localhost:5000/');
    assert.strictEqual(res.status, 200);
    assert(res.text.includes('<div id="root">') || res.text.includes('<!DOCTYPE html>'));
  });

  // 5. CPCB Authorized Recyclers Query
  await check('5. Query CPCB Authorized Recyclers Registry from Ledger', async () => {
    const res = await fetchHttp('http://localhost:5000/api/recyclers');
    assert.strictEqual(res.status, 200);
    assert(res.data.count >= 3);
    const karRec = res.data.recyclers.find(r => r.recyclerId === 'REC-CPCB-KAR-042');
    assert(karRec, 'REC-CPCB-KAR-042 must be registered');
    assert.strictEqual(karRec.status, 'AUTHORIZED');
  });

  // 6. Manufacturer Registers Battery -> Unique Battery ID + QR Code
  let testBatteryId = '';
  await check('6. Manufacturer Registers Battery -> Unique ID & QR Generated on Ledger', async () => {
    const res = await fetchHttp('http://localhost:5000/api/batteries/register', {
      method: 'POST',
      body: {
        chemistry: 'LITHIUM_ION',
        model: 'Exide EV-Pack 60V 50Ah LFP',
        weightKg: 36.5,
        manufacturerId: 'MFG-EXIDE-IND-KOL',
        producerEprNo: 'CPCB-EPR-BWM-2024-EX992'
      }
    });

    assert.strictEqual(res.status, 201);
    assert(res.data.success);
    testBatteryId = res.data.battery.id;
    assert(testBatteryId.startsWith('BAT-IND-2026-'));
    assert(res.data.qrCode.startsWith('data:image/png;base64,'));
    assert(res.data.blockNumber >= 1);
    console.log(`       Minted Battery: ${testBatteryId} on Fabric Block #${res.data.blockNumber}`);
  });

  // 7. Consumer activates battery
  await check('7. Consumer Activates Battery -> State Transitions to IN_USE', async () => {
    const res = await fetchHttp('http://localhost:5000/api/batteries/transfer-consumer', {
      method: 'POST',
      body: {
        batteryId: testBatteryId,
        consumerRegion: 'Karnataka / Bengaluru Urban'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.battery.status, 'IN_USE');
  });

  // 8. Informal Collector logs collection
  await check('8. Informal Collector Logs Scrap Collection -> State Transitions to COLLECTED', async () => {
    const res = await fetchHttp('http://localhost:5000/api/batteries/collect', {
      method: 'POST',
      body: {
        batteryId: testBatteryId,
        collectorId: 'COLL-SCRAP-BLR-09',
        collectionLocation: 'Shivajinagar Scrap Aggregation Hub, Bengaluru',
        condition: 'USED_DEPLETED'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.battery.status, 'COLLECTED');
  });

  // 9. Recycler Authorization Check Rejection
  await check('9. Smart Contract Authorization: Rejects Unauthorized Recycler', async () => {
    const res = await fetchHttp('http://localhost:5000/api/batteries/receive', {
      method: 'POST',
      body: {
        batteryId: testBatteryId,
        recyclerId: 'ILLEGAL-UNLICENSED-SCRAPPER'
      }
    });

    assert.strictEqual(res.status, 400);
    assert(res.data.error.includes('UNAUTHORIZED_RECYCLER'));
    console.log('       Unauthorized scrapper successfully blocked by chaincode');
  });

  // 10. Authorized Recycler receives custody
  await check('10. Authorized Recycler Receives Custody -> State Transitions to RECEIVED_BY_RECYCLER', async () => {
    const res = await fetchHttp('http://localhost:5000/api/batteries/receive', {
      method: 'POST',
      body: {
        batteryId: testBatteryId,
        recyclerId: 'REC-CPCB-KAR-042'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.battery.status, 'RECEIVED_BY_RECYCLER');
  });

  // 11. Recycle Battery & Mint EPR Certificate
  let issuedCertId = '';
  await check('11. Authorized Recycler Recycles Battery -> Mints Immutable EPR Certificate', async () => {
    const res = await fetchHttp('http://localhost:5000/api/batteries/recycle', {
      method: 'POST',
      body: {
        batteryId: testBatteryId,
        recyclerId: 'REC-CPCB-KAR-042',
        recoveredMaterials: {
          recoveredLithiumKg: 2.9,
          recoveredCobaltKg: 1.8,
          recoveredPlasticsKg: 5.1,
          recoveryRatePct: 93.0
        }
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.battery.status, 'EPR_CERTIFIED');
    issuedCertId = res.data.certificate.certificateId;
    assert(issuedCertId.startsWith('EPR-CERT-IND-'));
    assert(res.data.certificate.cryptographicSeal.length === 64);
    assert(res.data.certificateQR.startsWith('data:image/png;base64,'));
    console.log(`       EPR Certificate Minted: ${issuedCertId} with SHA-256 seal`);
  });

  // 12. Smart Contract Double-Recycling Prevention
  await check('12. Smart Contract Double-Recycling Prevention: Rejects Second Recycle Attempt', async () => {
    const res = await fetchHttp('http://localhost:5000/api/batteries/recycle', {
      method: 'POST',
      body: {
        batteryId: testBatteryId,
        recyclerId: 'REC-CPCB-KAR-042',
        recoveredMaterials: {}
      }
    });

    assert.strictEqual(res.status, 400);
    assert(res.data.error.includes('DOUBLE_RECYCLING_PREVENTED'));
    console.log('       Smart contract strictly blocked double-recycling fraud attempt');
  });

  // 13. Regulator Verifies Genuine Certificate
  await check('13. CPCB Regulator Verifies Authentic EPR Certificate', async () => {
    const res = await fetchHttp(`http://localhost:5000/api/certificates/${issuedCertId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.valid, true);
    assert.strictEqual(res.data.certificate.certificateId, issuedCertId);
    assert.strictEqual(res.data.linkedBattery.id, testBatteryId);
  });

  // 14. Regulator Rejects Fake/Forged Certificate
  await check('14. CPCB Regulator Rejects Fake Certificate ID with FRAUD_ALERT', async () => {
    const res = await fetchHttp('http://localhost:5000/api/certificates/FAKE-FORGERY-CERT-0000');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.valid, false);
    assert(res.data.error.includes('FRAUD_ALERT'));
    console.log('       Fake certificate rejected with FRAUD_ALERT as required');
  });

  // 15. Chronological Transaction History (GetHistoryForKey)
  await check('15. Chronological Battery Transaction History (`GetHistoryForKey`)', async () => {
    const res = await fetchHttp(`http://localhost:5000/api/batteries/${testBatteryId}/history`);
    assert.strictEqual(res.status, 200);
    assert(res.data.history.length >= 5);
    console.log(`       History contains ${res.data.history.length} chronological transitions:`);
    res.data.history.forEach((h, i) => {
      console.log(`         [#${i + 1}] TxID: ${h.txId} | Status: ${h.value.status} | Time: ${h.timestamp}`);
    });
  });

  // 16. Regulator National Dashboard Metrics
  await check('16. National CPCB Dashboard Metrics Aggregated from Fabric Ledger', async () => {
    const res = await fetchHttp('http://localhost:5000/api/regulator/dashboard');
    assert.strictEqual(res.status, 200);
    assert(res.data.metrics.counts.totalRegistered >= 1);
    assert(res.data.metrics.counts.eprCertified >= 1);
    assert(res.data.metrics.materialsRecovered.lithiumKg > 0);
  });

  console.log('\n======================================================================');
  console.log(`FINAL LIVE SYSTEM VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAll().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
