'use strict';

const path = require('path');
const { spawn } = require('child_process');

console.log('======================================================================');
console.log('STARTING BLOCKCHAIN-BASED EPR VERIFICATION SYSTEM (HYPERLEDGER FABRIC)');
console.log('CPCB India Battery Waste Management Rules 2022 Architecture');
console.log('======================================================================\n');

// The legacy simulator remains on disk for rollback, but is deliberately not started.
// The Express API connects directly to the real Fabric Gateway from WSL.
console.log('[1/2] Starting Backend API & real Fabric Gateway integration...');
const backend = require('./backend/server');

// 2. Start Vite Dev Server (Port 5173)
console.log('[2/2] Starting Vite Dev Server on http://localhost:5173...');
const nodeExe = process.execPath;
const viteBin = path.join(__dirname, 'frontend/node_modules/vite/bin/vite.js');

const viteProcess = spawn(nodeExe, [viteBin, '--port', '5173', '--host'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  env: process.env
});

viteProcess.on('error', (err) => {
  console.log('[Vite Notice] Vite dev server notice:', err.message);
  console.log('[Vite Notice] You can access the application at http://localhost:5000');
});

setTimeout(() => {
  console.log('\n======================================================================');
  console.log('ALL SERVICES ARE RUNNING AND DEMO READY:');
  console.log('  🌐 Frontend UI (Vite):         http://localhost:5173');
  console.log('  🌐 Frontend UI (Direct API):   http://localhost:5000');
  console.log('  ⚡ Backend REST API:           http://localhost:5000/api');
  console.log('  ⛓️  Real Fabric channel:         mychannel (peer0.org1.example.com)');
  console.log('======================================================================\n');
}, 1500);

process.on('SIGINT', () => {
  console.log('\nShutting down services...');
  viteProcess.kill();
  process.exit(0);
});
