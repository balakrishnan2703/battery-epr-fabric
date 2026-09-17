'use strict';

const http = require('http');
const assert = require('assert');

// Start ledger node
const ledgerServer = require('../blockchain/ledger-node/server');
// Start backend app
const backendApp = require('./server');

function request(urlPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('\n================================================================');
  console.log('RUNNING FULL BACKEND + FABRIC LEDGER INTEGRATION TESTS');
  console.log('================================================================\n');

  // Give servers 500ms to initialize
  await new Promise(r => setTimeout(r, 600));

  // 1. Health check
  console.log('1. Checking Backend Health...');
  const health = await request('/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.status, 'UP');
  console.log('   [PASS] Health OK');

  // 2. Register battery
  console.log('2. Registering Battery as Manufacturer...');
  const regRes = await request('/api/batteries/register', 'POST', {
    chemistry: 'LITHIUM_ION',
    model: 'Amara Raja EV-Power 72V 40Ah',
    weightKg: 28.0,
    manufacturerId: 'MFG-AMARA-RAJA-AP',
    producerEprNo: 'CPCB-EPR-BWM-2023-AMR01'
  });
  assert.strictEqual(regRes.status, 201);
  assert(regRes.data.success);
  const batteryId = regRes.data.battery.id;
  assert(batteryId.startsWith('BAT-IND-2026-'));
  assert(regRes.data.qrCode.startsWith('data:image/png;base64,'));
  console.log(`   [PASS] Registered Battery ID: ${batteryId} with generated QR code`);

  // 3. Transfer to Consumer
  console.log('3. Transferring to Consumer...');
  const transRes = await request('/api/batteries/transfer-consumer', 'POST', {
    batteryId,
    consumerRegion: 'Maharashtra / Pune'
  });
  assert.strictEqual(transRes.status, 200);
  assert.strictEqual(transRes.data.battery.status, 'IN_USE');
  console.log('   [PASS] Battery status: IN_USE');

  // 4. Collector logs collection
  console.log('4. Logging Informal Collection...');
  const colRes = await request('/api/batteries/collect', 'POST', {
    batteryId,
    collectorId: 'COLL-SCRAP-PUNE-88',
    collectionLocation: 'Bhosari Scrap Yard, Pune',
    condition: 'USED_DISCHARGED'
  });
  assert.strictEqual(colRes.status, 200);
  assert.strictEqual(colRes.data.battery.status, 'COLLECTED');
  console.log('   [PASS] Battery status: COLLECTED');

  // 5. Unauthorized Recycler Check (Rejection test)
  console.log('5. Testing Unauthorized Recycler Rejection...');
  const unauthRes = await request('/api/batteries/receive', 'POST', {
    batteryId,
    recyclerId: 'ILLEGAL-UNLICENSED-SCRAPPER'
  });
  assert.strictEqual(unauthRes.status, 400);
  assert(unauthRes.data.error.includes('UNAUTHORIZED_RECYCLER'));
  console.log('   [PASS] Unauthorized recycler correctly rejected by smart contract');

  // 6. Authorized Recycler Receives Battery
  console.log('6. Authorized Recycler receiving battery custody...');
  const recvRes = await request('/api/batteries/receive', 'POST', {
    batteryId,
    recyclerId: 'REC-CPCB-MH-108'
  });
  assert.strictEqual(recvRes.status, 200);
  assert.strictEqual(recvRes.data.battery.status, 'RECEIVED_BY_RECYCLER');
  console.log('   [PASS] Authorized Recycler REC-CPCB-MH-108 confirmed custody');

  // 7. Recycler Marks Recycled & Generates EPR Certificate
  console.log('7. Recycling Battery & Minting EPR Certificate...');
  const recycleRes = await request('/api/batteries/recycle', 'POST', {
    batteryId,
    recyclerId: 'REC-CPCB-MH-108',
    recoveredMaterials: {
      recoveredLithiumKg: 2.2,
      recoveredCobaltKg: 1.4,
      recoveredPlasticsKg: 4.1,
      recoveryRatePct: 92.0
    }
  });
  assert.strictEqual(recycleRes.status, 200);
  assert.strictEqual(recycleRes.data.battery.status, 'EPR_CERTIFIED');
  const certId = recycleRes.data.certificate.certificateId;
  assert(certId.startsWith('EPR-CERT-IND-'));
  assert(recycleRes.data.certificateQR.startsWith('data:image/png;base64,'));
  console.log(`   [PASS] Battery Recycled! EPR Certificate Minted: ${certId}`);

  // 8. Double Recycling Prevention Check
  console.log('8. Testing Double-Recycling Prevention...');
  const doubleRecycleRes = await request('/api/batteries/recycle', 'POST', {
    batteryId,
    recyclerId: 'REC-CPCB-MH-108',
    recoveredMaterials: {}
  });
  assert.strictEqual(doubleRecycleRes.status, 400);
  assert(doubleRecycleRes.data.error.includes('DOUBLE_RECYCLING_PREVENTED'));
  console.log('   [PASS] Smart contract prevented double-recycling fraud!');

  // 9. Verify Authentic EPR Certificate
  console.log('9. Verifying Authentic EPR Certificate as Regulator...');
  const verifyValidRes = await request(`/api/certificates/${certId}`);
  assert.strictEqual(verifyValidRes.status, 200);
  assert.strictEqual(verifyValidRes.data.valid, true);
  assert.strictEqual(verifyValidRes.data.certificate.certificateId, certId);
  console.log('   [PASS] Regulator successfully verified certificate on Fabric ledger');

  // 10. Reject Fake/Invalid EPR Certificate
  console.log('10. Verifying Fake/Forged EPR Certificate...');
  const verifyFakeRes = await request('/api/certificates/FAKE-CERT-FORGERY-1234');
  assert.strictEqual(verifyFakeRes.status, 200);
  assert.strictEqual(verifyFakeRes.data.valid, false);
  assert(verifyFakeRes.data.error.includes('FRAUD_ALERT'));
  console.log('   [PASS] Fake certificate rejected with FRAUD_ALERT');

  // 11. Battery Transaction History (GetHistoryForKey)
  console.log('11. Fetching Battery Lifecycle Transaction History...');
  const historyRes = await request(`/api/batteries/${batteryId}/history`);
  assert.strictEqual(historyRes.status, 200);
  assert(historyRes.data.history.length >= 5);
  console.log(`   [PASS] Retrieved ${historyRes.data.history.length} chronological ledger transitions`);

  // 12. Regulator Dashboard Metrics
  console.log('12. Querying CPCB National Regulator Dashboard...');
  const dashRes = await request('/api/regulator/dashboard');
  assert.strictEqual(dashRes.status, 200);
  assert(dashRes.data.metrics.counts.totalRegistered >= 1);
  assert(dashRes.data.metrics.counts.eprCertified >= 1);
  console.log('   [PASS] National Dashboard metrics aggregated from ledger world state');

  console.log('\n================================================================');
  console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY (12/12)!');
  console.log('================================================================\n');

  process.exit(0);
}

run().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
