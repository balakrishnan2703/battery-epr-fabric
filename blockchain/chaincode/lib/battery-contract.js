'use strict';

let ContractClass;
try {
  const { Contract } = require('fabric-contract-api');
  ContractClass = Contract;
} catch (e) {
  ContractClass = class FallbackContract {
    constructor(name) { this.name = name; }
  };
}

const crypto = require('crypto');
const { BatteryStatus, Chemistries } = require('./models');

class BatteryEPRContract extends ContractClass {
  constructor() {
    super('BatteryEPRContract');
  }

  /**
   * Helper: compute deterministic SHA-256 seal for EPR Certificate
   */
  _computeSeal(certId, batteryId, recyclerId, producerId, weightKg, txId) {
    const payload = `${certId}|${batteryId}|${recyclerId}|${producerId}|${weightKg}|${txId}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  // Use Fabric's proposal timestamp for every state write. Date.now() and
  // Math.random() cause different endorsers to simulate different results.
  _transactionTimestamp(ctx) {
    const timestamp = ctx.stub.getTxTimestamp();
    const seconds = Number(timestamp.seconds.toString());
    const millis = seconds * 1000 + Math.floor((timestamp.nanos || 0) / 1000000);
    return new Date(millis).toISOString();
  }

  /**
   * InitLedger: Seeds CPCB Authorized Recyclers into ledger state
   */
  async InitLedger(ctx) {
    console.info('============= START : Initialize Battery EPR Ledger ===========');

    const recyclers = [
      {
        recyclerId: 'REC-CPCB-KAR-042',
        companyName: 'EcoMetals Green Recycling Ltd',
        cpcbAuthNumber: 'CPCB/BWM/AUTH/2023/REC-KAR-042',
        state: 'Karnataka',
        permittedChemistries: [Chemistries.LITHIUM_ION, Chemistries.LEAD_ACID],
        annualCapacityTons: 6500,
        status: 'AUTHORIZED',
        authExpiry: '2028-12-31',
        docType: 'recycler'
      },
      {
        recyclerId: 'REC-CPCB-MH-108',
        companyName: 'Attero CleanTech India Pvt Ltd',
        cpcbAuthNumber: 'CPCB/BWM/AUTH/2022/REC-MH-108',
        state: 'Maharashtra',
        permittedChemistries: [Chemistries.LITHIUM_ION, Chemistries.LEAD_ACID, Chemistries.NICKEL_CADMIUM],
        annualCapacityTons: 12000,
        status: 'AUTHORIZED',
        authExpiry: '2029-06-30',
        docType: 'recycler'
      },
      {
        recyclerId: 'REC-CPCB-DL-021',
        companyName: 'Gravita PureMetals Solutions',
        cpcbAuthNumber: 'CPCB/BWM/AUTH/2024/REC-DL-021',
        state: 'Delhi NCR',
        permittedChemistries: [Chemistries.LEAD_ACID],
        annualCapacityTons: 8000,
        status: 'AUTHORIZED',
        authExpiry: '2027-10-15',
        docType: 'recycler'
      }
    ];

    for (const rec of recyclers) {
      const key = `RECYCLER_${rec.recyclerId}`;
      await ctx.stub.putState(key, Buffer.from(JSON.stringify(rec)));
      console.info(`Added Recycler: ${rec.recyclerId}`);
    }

    // Seed initial demo battery in MANUFACTURED state
    const now = this._transactionTimestamp(ctx);
    const seedBattery = {
      id: 'BAT-IND-2026-SEED01',
      chemistry: Chemistries.LITHIUM_ION,
      model: 'Tata AutoComp EV-Cell 48V 60Ah',
      weightKg: 24.5,
      manufacturerId: 'MFG-TATA-AUTO-PUNE',
      producerEprNo: 'CPCB-EPR-BWM-2023-TAT789',
      status: BatteryStatus.MANUFACTURED,
      consumerRegion: null,
      collectorId: null,
      collectionLocation: null,
      collectionDate: null,
      recyclerId: null,
      receivedDate: null,
      recycledDate: null,
      recoveredMaterials: null,
      eprCertificateId: null,
      registeredAt: now,
      lastUpdatedAt: now,
      docType: 'battery'
    };
    await ctx.stub.putState('BATTERY_' + seedBattery.id, Buffer.from(JSON.stringify(seedBattery)));

    console.info('============= END : Initialize Battery EPR Ledger ===========');
    return JSON.stringify({ success: true, message: 'Ledger initialized with CPCB authorized recyclers' });
  }

  /**
   * RegisterBattery: Manufacturer mints a new battery record with a unique Battery ID
   */
  async RegisterBattery(ctx, id, chemistry, model, weightKg, manufacturerId, producerEprNo) {
    if (!id || !chemistry || !model || !manufacturerId || !producerEprNo) {
      throw new Error('INVALID_ARGUMENTS: id, chemistry, model, manufacturerId, and producerEprNo are required');
    }

    const numericWeight = parseFloat(weightKg);
    if (isNaN(numericWeight) || numericWeight <= 0) {
      throw new Error('INVALID_WEIGHT: Battery weight must be a positive number in kg');
    }

    const validChemistries = Object.values(Chemistries);
    if (!validChemistries.includes(chemistry)) {
      throw new Error(`INVALID_CHEMISTRY: Allowed chemistries are ${validChemistries.join(', ')}`);
    }

    const key = 'BATTERY_' + id;
    const existsBytes = await ctx.stub.getState(key);
    if (existsBytes && existsBytes.length > 0) {
      throw new Error(`BATTERY_ALREADY_EXISTS: Battery with ID ${id} is already registered on the ledger.`);
    }

    const now = this._transactionTimestamp(ctx);
    const battery = {
      id,
      chemistry,
      model,
      weightKg: numericWeight,
      manufacturerId,
      producerEprNo,
      status: BatteryStatus.MANUFACTURED,
      consumerRegion: null,
      collectorId: null,
      collectionLocation: null,
      collectionDate: null,
      recyclerId: null,
      receivedDate: null,
      recycledDate: null,
      recoveredMaterials: null,
      eprCertificateId: null,
      registeredAt: now,
      lastUpdatedAt: now,
      docType: 'battery'
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(battery)));

    ctx.stub.setEvent('BatteryRegistered', Buffer.from(JSON.stringify({
      id,
      manufacturerId,
      chemistry,
      status: battery.status,
      timestamp: now
    })));

    return JSON.stringify(battery);
  }

  /**
   * GetBattery: Reads current state of a battery from world state
   */
  async GetBattery(ctx, batteryId) {
    const key = 'BATTERY_' + batteryId;
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`BATTERY_NOT_FOUND: Battery ${batteryId} not found on the ledger.`);
    }
    return bytes.toString();
  }

  /**
   * GetAllBatteries: Retrieves all registered batteries
   */
  async GetAllBatteries(ctx) {
    const startKey = 'BATTERY_';
    const endKey = 'BATTERY_\uffff';
    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const allBatteries = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString('utf8'));
          if (record.docType === 'battery') {
            allBatteries.push(record);
          }
        } catch (err) {
          console.error('Error parsing battery record:', err);
        }
      }
      if (res.done) {
        if (iterator.close) {
          await iterator.close();
        }
        break;
      }
    }

    return JSON.stringify(allBatteries);
  }

  // Alias for GetAllBatteries
  async QueryAllBatteries(ctx) {
    return this.GetAllBatteries(ctx);
  }

  /**
   * TransferBattery / TransferToConsumer: Battery transferred to consumer (state -> IN_USE)
   */
  async TransferBattery(ctx, batteryId, consumerRegion) {
    const key = 'BATTERY_' + batteryId;
    const batteryBytes = await ctx.stub.getState(key);
    if (!batteryBytes || batteryBytes.length === 0) {
      throw new Error(`BATTERY_NOT_FOUND: Battery ${batteryId} does not exist on the ledger.`);
    }

    const battery = JSON.parse(batteryBytes.toString());
    if (battery.status !== BatteryStatus.MANUFACTURED) {
      throw new Error(`INVALID_STATE_TRANSITION: Cannot transfer to consumer from status '${battery.status}'. Must be MANUFACTURED.`);
    }

    if (!consumerRegion || !consumerRegion.trim()) {
      throw new Error('INVALID_ARGUMENTS: consumerRegion is required.');
    }
    battery.status = BatteryStatus.IN_USE;
    battery.consumerRegion = consumerRegion;
    battery.lastUpdatedAt = this._transactionTimestamp(ctx);

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(battery)));
    ctx.stub.setEvent('BatteryTransferred', Buffer.from(JSON.stringify({ id: batteryId, status: battery.status })));

    return JSON.stringify(battery);
  }

  // Alias for TransferBattery
  async TransferToConsumer(ctx, batteryId, consumerRegion) {
    return this.TransferBattery(ctx, batteryId, consumerRegion);
  }

  /**
   * RegisterCollection / CollectBattery: Collector logs aggregation (state -> COLLECTED)
   */
  async RegisterCollection(ctx, batteryId, collectorId, collectionLocation, condition) {
    if (!collectorId || !collectionLocation) {
      throw new Error('INVALID_ARGUMENTS: collectorId and collectionLocation are required.');
    }

    const key = 'BATTERY_' + batteryId;
    const batteryBytes = await ctx.stub.getState(key);
    if (!batteryBytes || batteryBytes.length === 0) {
      throw new Error(`BATTERY_NOT_FOUND: Battery ${batteryId} does not exist on the ledger.`);
    }

    const battery = JSON.parse(batteryBytes.toString());
    if (battery.status !== BatteryStatus.IN_USE) {
      throw new Error(`INVALID_STATE_TRANSITION: Cannot collect from status '${battery.status}'. Must be IN_USE.`);
    }
    if (battery.status === BatteryStatus.RECYCLED || battery.status === BatteryStatus.EPR_CERTIFIED) {
      throw new Error(`DOUBLE_RECYCLING_PREVENTED: Battery ${batteryId} has already been recycled!`);
    }

    battery.status = BatteryStatus.COLLECTED;
    battery.collectorId = collectorId;
    battery.collectionLocation = collectionLocation;
    battery.collectionCondition = condition || 'USED_DEPLETED';
    battery.collectionDate = this._transactionTimestamp(ctx);
    battery.lastUpdatedAt = battery.collectionDate;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(battery)));
    ctx.stub.setEvent('BatteryCollected', Buffer.from(JSON.stringify({ id: batteryId, collectorId, status: battery.status })));

    return JSON.stringify(battery);
  }

  // Alias for RegisterCollection
  async CollectBattery(ctx, batteryId, collectorId, collectionLocation, condition) {
    return this.RegisterCollection(ctx, batteryId, collectorId, collectionLocation, condition);
  }

  /**
   * ReceiveBattery: Recycler receives physical custody (state -> AT_RECYCLER)
   */
  async ReceiveBattery(ctx, batteryId, recyclerId) {
    if (!recyclerId) {
      throw new Error('INVALID_ARGUMENTS: recyclerId is required.');
    }

    // Verify Recycler Authorization on ledger
    await this._verifyRecycler(ctx, recyclerId);

    const key = 'BATTERY_' + batteryId;
    const batteryBytes = await ctx.stub.getState(key);
    if (!batteryBytes || batteryBytes.length === 0) {
      throw new Error(`BATTERY_NOT_FOUND: Battery ${batteryId} does not exist on the ledger.`);
    }

    const battery = JSON.parse(batteryBytes.toString());
    if (battery.status !== BatteryStatus.COLLECTED) {
      throw new Error(`INVALID_STATE_TRANSITION: Cannot receive at recycler from status '${battery.status}'. Must be COLLECTED.`);
    }
    if (battery.status === BatteryStatus.RECYCLED || battery.status === BatteryStatus.EPR_CERTIFIED) {
      throw new Error(`DOUBLE_RECYCLING_PREVENTED: Battery ${batteryId} is already recycled.`);
    }

    battery.status = BatteryStatus.AT_RECYCLER;
    battery.recyclerId = recyclerId;
    battery.receivedDate = this._transactionTimestamp(ctx);
    battery.lastUpdatedAt = battery.receivedDate;

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(battery)));
    ctx.stub.setEvent('BatteryReceivedAtRecycler', Buffer.from(JSON.stringify({ id: batteryId, recyclerId, status: battery.status })));

    return JSON.stringify(battery);
  }

  /**
   * RecycleBattery:
   * 1. Verifies Recycler Authorization and permitted chemistries.
   * 2. Prevents double-recycling if already recycled.
   * 3. Records recovered materials.
   * 4. Automatically mints EPR Certificate and prevents duplicate certificates.
   */
  async RecycleBattery(ctx, batteryId, recyclerId, recoveredMaterialsJson) {
    if (!batteryId || !recyclerId) {
      throw new Error('INVALID_ARGUMENTS: batteryId and recyclerId are required.');
    }

    const key = 'BATTERY_' + batteryId;
    const batteryBytes = await ctx.stub.getState(key);
    if (!batteryBytes || batteryBytes.length === 0) {
      throw new Error(`BATTERY_NOT_FOUND: Battery ${batteryId} does not exist on the ledger.`);
    }

    const battery = JSON.parse(batteryBytes.toString());

    // REQUIREMENT: Prevent recycling the same battery twice
    if (battery.status === BatteryStatus.RECYCLED || battery.status === BatteryStatus.EPR_CERTIFIED) {
      throw new Error(`DOUBLE_RECYCLING_PREVENTED: Battery ${batteryId} was already recycled on ${battery.recycledDate}. Smart contract prevents double-recycling fraud.`);
    }

    if (battery.status !== BatteryStatus.AT_RECYCLER) {
      throw new Error(`INVALID_STATE_TRANSITION: Cannot recycle from status '${battery.status}'. Must be AT_RECYCLER.`);
    }
    if (battery.recyclerId !== recyclerId) {
      throw new Error(`RECYCLER_CUSTODY_MISMATCH: Battery ${batteryId} was received by ${battery.recyclerId}, not ${recyclerId}.`);
    }

    // REQUIREMENT: Verify recycler authorization
    const recycler = await this._verifyRecycler(ctx, recyclerId);

    // Verify chemistry permit
    if (!recycler.permittedChemistries.includes(battery.chemistry)) {
      throw new Error(`UNAUTHORIZED_CHEMISTRY: Recycler ${recyclerId} is authorized for [${recycler.permittedChemistries.join(', ')}], NOT permitted for ${battery.chemistry}.`);
    }

    let recovered;
    try {
      recovered = typeof recoveredMaterialsJson === 'string' ? JSON.parse(recoveredMaterialsJson) : recoveredMaterialsJson;
    } catch (e) {
      recovered = {
        recoveredLeadKg: battery.chemistry === Chemistries.LEAD_ACID ? +(battery.weightKg * 0.65).toFixed(2) : 0,
        recoveredLithiumKg: battery.chemistry === Chemistries.LITHIUM_ION ? +(battery.weightKg * 0.08).toFixed(2) : 0,
        recoveredCobaltKg: battery.chemistry === Chemistries.LITHIUM_ION ? +(battery.weightKg * 0.05).toFixed(2) : 0,
        recoveredPlasticsKg: +(battery.weightKg * 0.15).toFixed(2),
        recoveryRatePct: 92.5
      };
    }

    const now = this._transactionTimestamp(ctx);
    battery.status = BatteryStatus.RECYCLED;
    battery.recyclerId = recyclerId;
    battery.recycledDate = now;
    battery.recoveredMaterials = recovered;
    battery.lastUpdatedAt = now;

    // REQUIREMENT: Generate EPR certificate after successful recycling & prevent duplicate certificates
    if (battery.eprCertificateId) {
      throw new Error(`DUPLICATE_EPR_PREVENTED: An EPR certificate already exists for battery ${batteryId}.`);
    }

    const certYear = now.slice(0, 4);
    const txId = ctx.stub.getTxID();
    const certId = `EPR-CERT-IND-${certYear}-${txId.slice(0, 16).toUpperCase()}`;
    const certKey = 'CERT_' + certId;

    const certExists = await ctx.stub.getState(certKey);
    if (certExists && certExists.length > 0) {
      throw new Error(`CERTIFICATE_COLLISION: Generated certificate ID ${certId} already exists.`);
    }

    const cryptographicSeal = this._computeSeal(certId, battery.id, recyclerId, battery.manufacturerId, battery.weightKg, txId);

    const recoveryRate = recovered.recoveryRatePct ? (recovered.recoveryRatePct / 100) : 0.90;
    const eprCreditPoints = +(battery.weightKg * recoveryRate).toFixed(2);

    const certificate = {
      certificateId: certId,
      batteryId: battery.id,
      recyclerId: recyclerId,
      recyclerName: recycler.companyName,
      cpcbAuthNumber: recycler.cpcbAuthNumber,
      producerId: battery.manufacturerId,
      producerEprNo: battery.producerEprNo,
      chemistry: battery.chemistry,
      batteryModel: battery.model,
      grossWeightKg: battery.weightKg,
      recoveredMaterials: recovered,
      eprCreditPoints,
      issuedAt: now,
      transactionId: txId,
      cryptographicSeal,
      complianceStatus: 'VALID_ISSUED',
      cpcbSeal: 'VERIFIED_UNDER_BWMR_2022',
      docType: 'eprCertificate'
    };

    await ctx.stub.putState(certKey, Buffer.from(JSON.stringify(certificate)));

    battery.eprCertificateId = certId;
    battery.status = BatteryStatus.EPR_CERTIFIED;
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(battery)));

    ctx.stub.setEvent('EPRCertificateGenerated', Buffer.from(JSON.stringify({
      certificateId: certId,
      batteryId: battery.id,
      recyclerId,
      eprCreditPoints,
      timestamp: now
    })));

    return JSON.stringify({
      battery,
      certificate
    });
  }

  /**
   * GenerateEPRCertificate: Standalone EPR Certificate generation call
   */
  async GenerateEPRCertificate(ctx, batteryId, recyclerId, recoveredMaterialsJson) {
    const batteryBytes = await ctx.stub.getState('BATTERY_' + batteryId);
    if (batteryBytes && batteryBytes.length > 0 && JSON.parse(batteryBytes.toString()).eprCertificateId) {
      throw new Error(`DUPLICATE_EPR_PREVENTED: An EPR certificate already exists for battery ${batteryId}.`);
    }
    return this.RecycleBattery(ctx, batteryId, recyclerId, recoveredMaterialsJson);
  }

  /**
   * VerifyEPRCertificate: Verifies EPR Certificate on ledger, rejects fake IDs
   */
  async VerifyEPRCertificate(ctx, certId) {
    if (!certId) {
      return JSON.stringify({
        valid: false,
        error: 'INVALID_INPUT: Certificate ID is required for verification.'
      });
    }

    const certKey = 'CERT_' + certId;
    const certBytes = await ctx.stub.getState(certKey);

    if (!certBytes || certBytes.length === 0) {
      return JSON.stringify({
        valid: false,
        certificateId: certId,
        error: 'FRAUD_ALERT: Certificate ID does NOT exist on the Hyperledger Fabric ledger. Possible counterfeit or forged certificate.',
        verificationTime: new Date().toISOString()
      });
    }

    const certificate = JSON.parse(certBytes.toString());

    const expectedSeal = this._computeSeal(
      certificate.certificateId,
      certificate.batteryId,
      certificate.recyclerId,
      certificate.producerId,
      certificate.grossWeightKg,
      certificate.transactionId
    );

    if (certificate.cryptographicSeal !== expectedSeal) {
      return JSON.stringify({
        valid: false,
        certificateId: certId,
        error: 'TAMPER_ALERT: Cryptographic seal mismatch! On-chain record integrity has been compromised.',
        verificationTime: new Date().toISOString()
      });
    }

    const batteryBytes = await ctx.stub.getState('BATTERY_' + certificate.batteryId);
    let linkedBattery = null;
    if (batteryBytes && batteryBytes.length > 0) {
      linkedBattery = JSON.parse(batteryBytes.toString());
    }

    return JSON.stringify({
      valid: true,
      message: 'Certificate successfully verified on Hyperledger Fabric ledger.',
      certificate,
      linkedBattery,
      verificationTime: new Date().toISOString()
    });
  }

  /**
   * GetCertificate: Retrieves single certificate from ledger
   */
  async GetCertificate(ctx, certId) {
    return this.VerifyEPRCertificate(ctx, certId);
  }

  /**
   * GetBatteryHistory: Retrieves full chronological key history using ctx.stub.getHistoryForKey
   */
  async GetBatteryHistory(ctx, batteryId) {
    const key = 'BATTERY_' + batteryId;
    const historyIterator = await ctx.stub.getHistoryForKey(key);
    const history = [];

    if (historyIterator) {
      while (true) {
        const res = await historyIterator.next();
        if (res.value) {
          const item = {
            txId: res.value.txId,
            timestamp: res.value.timestamp,
            isDelete: res.value.isDelete,
            value: null
          };
          if (!res.value.isDelete && res.value.value) {
            try {
              item.value = JSON.parse(res.value.value.toString('utf8'));
            } catch (err) {
              item.value = res.value.value.toString('utf8');
            }
          }
          history.push(item);
        }
        if (res.done) {
          if (historyIterator.close) {
            await historyIterator.close();
          }
          break;
        }
      }
    }

    return JSON.stringify(history);
  }

  /**
   * VerifyRecycler: Queries single recycler or returns authorization status
   */
  async VerifyRecycler(ctx, recyclerId) {
    const recycler = await this._verifyRecycler(ctx, recyclerId);
    return JSON.stringify(recycler);
  }

  /**
   * GetAuthorizedRecyclers: Retrieves all CPCB authorized recyclers
   */
  async GetAuthorizedRecyclers(ctx) {
    const startKey = 'RECYCLER_';
    const endKey = 'RECYCLER_\uffff';
    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const recyclers = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString('utf8'));
          if (record.docType === 'recycler') {
            recyclers.push(record);
          }
        } catch (err) {
          console.error('Error parsing recycler record:', err);
        }
      }
      if (res.done) {
        if (iterator.close) {
          await iterator.close();
        }
        break;
      }
    }

    return JSON.stringify(recyclers);
  }

  /**
   * QueryAllCertificates: Retrieves all EPR certificates
   */
  async QueryAllCertificates(ctx) {
    const startKey = 'CERT_';
    const endKey = 'CERT_\uffff';
    const iterator = await ctx.stub.getStateByRange(startKey, endKey);
    const certificates = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString('utf8'));
          if (record.docType === 'eprCertificate') {
            certificates.push(record);
          }
        } catch (err) {
          console.error('Error parsing certificate record:', err);
        }
      }
      if (res.done) {
        if (iterator.close) {
          await iterator.close();
        }
        break;
      }
    }

    return JSON.stringify(certificates);
  }

  /**
   * Internal Helper: verify recycler exists and is AUTHORIZED
   */
  async _verifyRecycler(ctx, recyclerId) {
    const key = 'RECYCLER_' + recyclerId;
    const bytes = await ctx.stub.getState(key);
    if (!bytes || bytes.length === 0) {
      throw new Error(`UNAUTHORIZED_RECYCLER: Recycler ${recyclerId} is NOT registered in the CPCB Authorized Recyclers Registry.`);
    }

    const recycler = JSON.parse(bytes.toString());
    if (recycler.status !== 'AUTHORIZED') {
      throw new Error(`RECYCLER_AUTHORIZATION_INVALID: Recycler ${recyclerId} status is '${recycler.status}'. Must be AUTHORIZED.`);
    }

    if (new Date(recycler.authExpiry) < new Date()) {
      throw new Error(`RECYCLER_AUTHORIZATION_EXPIRED: CPCB Authorization for ${recyclerId} expired on ${recycler.authExpiry}.`);
    }

    return recycler;
  }
}

module.exports = BatteryEPRContract;
