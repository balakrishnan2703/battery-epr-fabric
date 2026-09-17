'use strict';

const fabricGateway = require('../fabric/gateway');
const QRService = require('../services/qrService');

class BatteryController {
  static async registerBattery(req, res) {
    try {
      const { chemistry, model, weightKg, manufacturerId, producerEprNo } = req.body;
      let id = req.body.id;

      if (!id || id.trim() === '') {
        const rand = Math.floor(100000 + Math.random() * 900000);
        id = `BAT-IND-2026-${rand}`;
      }

      if (!chemistry || !model || !weightKg || !manufacturerId || !producerEprNo) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: chemistry, model, weightKg, manufacturerId, producerEprNo'
        });
      }

      const fabricRes = await fabricGateway.submitTransaction(
        'RegisterBattery',
        id,
        chemistry,
        model,
        weightKg.toString(),
        manufacturerId,
        producerEprNo
      );

      const battery = JSON.parse(fabricRes.result);
      const { qrDataUrl, qrPayload } = await QRService.generateBatteryQR(id, battery);

      return res.status(201).json({
        success: true,
        message: `Battery ${id} successfully registered on Hyperledger Fabric ledger`,
        battery,
        qrCode: qrDataUrl,
        qrPayload,
        txId: fabricRes.txId,
        blockNumber: fabricRes.blockNumber,
        blockHash: fabricRes.blockHash
      });
    } catch (err) {
      console.error('[BatteryController] registerBattery error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async transferToConsumer(req, res) {
    try {
      const { batteryId, consumerRegion } = req.body;
      if (!batteryId) {
        return res.status(400).json({ success: false, error: 'batteryId is required' });
      }

      const fabricRes = await fabricGateway.submitTransaction(
        'TransferToConsumer',
        batteryId,
        consumerRegion || 'Pan-India'
      );

      const battery = JSON.parse(fabricRes.result);
      return res.json({
        success: true,
        message: `Battery ${batteryId} custody transferred to Consumer on Fabric ledger`,
        battery,
        txId: fabricRes.txId,
        blockNumber: fabricRes.blockNumber
      });
    } catch (err) {
      console.error('[BatteryController] transferToConsumer error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async collectBattery(req, res) {
    try {
      const { batteryId, collectorId, collectionLocation, condition } = req.body;
      if (!batteryId || !collectorId || !collectionLocation) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: batteryId, collectorId, collectionLocation'
        });
      }

      const fabricRes = await fabricGateway.submitTransaction(
        'CollectBattery',
        batteryId,
        collectorId,
        collectionLocation,
        condition || 'USED_DEPLETED'
      );

      const battery = JSON.parse(fabricRes.result);
      return res.json({
        success: true,
        message: `Battery ${batteryId} scrap collection logged on Fabric ledger`,
        battery,
        txId: fabricRes.txId,
        blockNumber: fabricRes.blockNumber
      });
    } catch (err) {
      console.error('[BatteryController] collectBattery error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async receiveBattery(req, res) {
    try {
      const { batteryId, recyclerId } = req.body;
      if (!batteryId || !recyclerId) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: batteryId, recyclerId'
        });
      }

      const fabricRes = await fabricGateway.submitTransaction(
        'ReceiveBattery',
        batteryId,
        recyclerId
      );

      const battery = JSON.parse(fabricRes.result);
      return res.json({
        success: true,
        message: `Authorized Recycler ${recyclerId} received custody of battery ${batteryId}`,
        battery,
        txId: fabricRes.txId,
        blockNumber: fabricRes.blockNumber
      });
    } catch (err) {
      console.error('[BatteryController] receiveBattery error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async recycleBattery(req, res) {
    try {
      const { batteryId, recyclerId, recoveredMaterials } = req.body;
      if (!batteryId || !recyclerId) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: batteryId, recyclerId'
        });
      }

      const fabricRes = await fabricGateway.submitTransaction(
        'RecycleBattery',
        batteryId,
        recyclerId,
        JSON.stringify(recoveredMaterials || {})
      );

      const parsedResult = JSON.parse(fabricRes.result);
      const { qrDataUrl } = await QRService.generateCertificateQR(
        parsedResult.certificate.certificateId,
        parsedResult.certificate
      );

      return res.json({
        success: true,
        message: `Battery ${batteryId} recycled & EPR Certificate ${parsedResult.certificate.certificateId} minted on Fabric ledger`,
        battery: parsedResult.battery,
        certificate: parsedResult.certificate,
        certificateQR: qrDataUrl,
        txId: fabricRes.txId,
        blockNumber: fabricRes.blockNumber,
        blockHash: fabricRes.blockHash
      });
    } catch (err) {
      console.error('[BatteryController] recycleBattery error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getBattery(req, res) {
    try {
      const { id } = req.params;
      const batteryStr = await fabricGateway.evaluateTransaction('GetBattery', id);
      const battery = JSON.parse(batteryStr);
      const { qrDataUrl } = await QRService.generateBatteryQR(battery.id, battery);

      return res.json({
        success: true,
        battery,
        qrCode: qrDataUrl
      });
    } catch (err) {
      console.error('[BatteryController] getBattery error:', err.message);
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  static async getBatteryHistory(req, res) {
    try {
      const { id } = req.params;
      const historyStr = await fabricGateway.evaluateTransaction('GetBatteryHistory', id);
      const history = JSON.parse(historyStr);

      return res.json({
        success: true,
        batteryId: id,
        totalTransactions: history.length,
        history
      });
    } catch (err) {
      console.error('[BatteryController] getBatteryHistory error:', err.message);
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  static async getAllBatteries(req, res) {
    try {
      const batteriesStr = await fabricGateway.evaluateTransaction('QueryAllBatteries');
      const batteries = JSON.parse(batteriesStr);
      return res.json({
        success: true,
        count: batteries.length,
        batteries
      });
    } catch (err) {
      console.error('[BatteryController] getAllBatteries error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = BatteryController;
