'use strict';

const fabricGateway = require('../fabric/gateway');
const QRService = require('../services/qrService');

class EPRController {
  static async verifyCertificate(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Certificate ID is required' });
      }

      const resultStr = await fabricGateway.evaluateTransaction('VerifyEPRCertificate', id);
      const verification = JSON.parse(resultStr);

      if (verification.valid && verification.certificate) {
        const { qrDataUrl } = await QRService.generateCertificateQR(id, verification.certificate);
        verification.qrCode = qrDataUrl;
      }

      return res.json(verification);
    } catch (err) {
      console.error('[EPRController] verifyCertificate error:', err.message);
      return res.status(400).json({ valid: false, error: err.message });
    }
  }

  static async getAllCertificates(req, res) {
    try {
      const certsStr = await fabricGateway.evaluateTransaction('QueryAllCertificates');
      const certificates = JSON.parse(certsStr);
      return res.json({
        success: true,
        count: certificates.length,
        certificates
      });
    } catch (err) {
      console.error('[EPRController] getAllCertificates error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = EPRController;
