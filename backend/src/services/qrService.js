'use strict';

const QRCode = require('qrcode');

class QRService {
  /**
   * Generates a Data URL QR Code encoding the Battery Digital Passport
   */
  static async generateBatteryQR(batteryId, metadata = {}) {
    const qrPayload = {
      standard: 'CPCB-BWMR-2022-PASSPORT',
      type: 'BATTERY_DIGITAL_PASSPORT',
      batteryId,
      chemistry: metadata.chemistry || 'N/A',
      producer: metadata.manufacturerId || 'N/A',
      eprNo: metadata.producerEprNo || 'N/A',
      verificationUrl: `http://localhost:5173/consumer?batteryId=${encodeURIComponent(batteryId)}`
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    return {
      qrDataUrl,
      qrPayload
    };
  }

  /**
   * Generates a Data URL QR Code for an EPR Certificate
   */
  static async generateCertificateQR(certificateId, metadata = {}) {
    const qrPayload = {
      standard: 'CPCB-BWMR-2022-EPR-CREDIT',
      type: 'EPR_CERTIFICATE_SEAL',
      certificateId,
      batteryId: metadata.batteryId || 'N/A',
      recyclerId: metadata.recyclerId || 'N/A',
      cryptographicSeal: metadata.cryptographicSeal || 'N/A',
      verificationUrl: `http://localhost:5173/regulator?certId=${encodeURIComponent(certificateId)}`
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#047857',
        light: '#ffffff'
      }
    });

    return {
      qrDataUrl,
      qrPayload
    };
  }
}

module.exports = QRService;
