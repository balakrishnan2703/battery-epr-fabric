'use strict';

const http = require('http');
const FabricLedgerEngine = require('./ledger-engine');

const PORT = process.env.FABRIC_NODE_PORT || 7054;
const ledger = new FabricLedgerEngine();

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health / Status
  if (req.method === 'GET' && url.pathname === '/api/fabric/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ledger.getStatus()));
    return;
  }

  // Get Blocks
  if (req.method === 'GET' && url.pathname === '/api/fabric/blocks') {
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ledger.getBlocks(limit)));
    return;
  }

  // Submit Transaction
  if (req.method === 'POST' && url.pathname === '/api/fabric/submit') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { functionName, args } = payload;
        if (!functionName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'functionName is required' }));
          return;
        }

        const commitResult = await ledger.submitTransaction(functionName, args || []);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          txId: commitResult.txId,
          blockNumber: commitResult.blockNumber,
          blockHash: commitResult.blockHash,
          result: commitResult.result,
          events: commitResult.events
        }));
      } catch (err) {
        console.error('[FabricLedger] Error submitting transaction:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Evaluate Transaction
  if (req.method === 'POST' && url.pathname === '/api/fabric/evaluate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { functionName, args } = payload;
        if (!functionName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'functionName is required' }));
          return;
        }

        const evalResult = await ledger.evaluateTransaction(functionName, args || []);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          result: evalResult
        }));
      } catch (err) {
        console.error('[FabricLedger] Error evaluating transaction:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[FabricLedger] Hyperledger Fabric Ledger Node running on port ${PORT}`);
  console.log(`[FabricLedger] Channel: battery-channel | Chaincode: battery-epr | MSP: Org1MSP`);
});

module.exports = server;
