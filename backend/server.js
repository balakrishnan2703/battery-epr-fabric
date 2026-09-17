'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');
const fabricGateway = require('./src/fabric/gateway');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health Check
app.get('/health', (req, res) => {
  const health = {
    status: 'UP',
    system: 'Blockchain-Based EPR Verification System for India Battery Recycling',
    network: 'Hyperledger Fabric Gateway',
    channel: process.env.FABRIC_CHANNEL || 'mychannel',
    timestamp: new Date().toISOString()
  };
  fabricGateway.getStatus().then((networkStatus) => {
    res.json({ ...health, fabric: networkStatus });
  }).catch((err) => {
    res.status(503).json({ ...health, status: 'DEGRADED', error: err.message });
  });
});

// Serve frontend build if available
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('<h1>Battery EPR Verification System API is Running</h1><p>Frontend is available at http://localhost:5173</p>');
    }
  });
});

// Start listening if not explicitly disabled
if (process.env.NO_LISTEN !== 'true') {
  app.listen(PORT, () => {
    console.log('================================================================');
    console.log(`BATTERY EPR REST API RUNNING ON http://localhost:${PORT}`);
    console.log(`Hyperledger Fabric Gateway configured for channel: ${process.env.FABRIC_CHANNEL || 'mychannel'}`);
    console.log(`Frontend UI available at: http://localhost:${PORT} & http://localhost:5173`);
    console.log('================================================================');
  });
}

module.exports = app;
