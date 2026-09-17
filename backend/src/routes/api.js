'use strict';

const express = require('express');
const router = express.Router();

const BatteryController = require('../controllers/batteryController');
const RecyclerController = require('../controllers/recyclerController');
const EPRController = require('../controllers/eprController');
const RegulatorController = require('../controllers/regulatorController');

// Battery Lifecycle Endpoints
router.post('/batteries/register', BatteryController.registerBattery);
router.post('/batteries/transfer-consumer', BatteryController.transferToConsumer);
router.post('/batteries/collect', BatteryController.collectBattery);
router.post('/batteries/receive', BatteryController.receiveBattery);
router.post('/batteries/recycle', BatteryController.recycleBattery);
router.get('/batteries', BatteryController.getAllBatteries);
router.get('/batteries/:id', BatteryController.getBattery);
router.get('/batteries/:id/history', BatteryController.getBatteryHistory);

// Recyclers
router.get('/recyclers', RecyclerController.getAuthorizedRecyclers);

// EPR Certificates
router.get('/certificates', EPRController.getAllCertificates);
router.get('/certificates/:id', EPRController.verifyCertificate);

// Regulator / CPCB Dashboard & Explorer
router.get('/regulator/dashboard', RegulatorController.getDashboardMetrics);
router.get('/regulator/blocks', RegulatorController.getLedgerBlocks);

module.exports = router;
