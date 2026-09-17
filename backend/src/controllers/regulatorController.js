'use strict';

const fabricGateway = require('../fabric/gateway');

class RegulatorController {
  static async getDashboardMetrics(req, res) {
    try {
      const [batteriesStr, certsStr, recyclersStr, status] = await Promise.all([
        fabricGateway.evaluateTransaction('QueryAllBatteries'),
        fabricGateway.evaluateTransaction('QueryAllCertificates'),
        fabricGateway.evaluateTransaction('GetAuthorizedRecyclers'),
        fabricGateway.getStatus()
      ]);

      const batteries = JSON.parse(batteriesStr);
      const certificates = JSON.parse(certsStr);
      const recyclers = JSON.parse(recyclersStr);

      // Aggregate lifecycle counts
      const counts = {
        totalRegistered: batteries.length,
        manufactured: 0,
        inUse: 0,
        collected: 0,
        receivedByRecycler: 0,
        recycled: 0,
        eprCertified: 0
      };

      const chemistryBreakdown = {
        LITHIUM_ION: 0,
        LEAD_ACID: 0,
        NICKEL_CADMIUM: 0,
        OTHER: 0
      };

      let totalGrossWeightKg = 0;
      let totalRecycledWeightKg = 0;

      for (const b of batteries) {
        if (b.status === 'MANUFACTURED') counts.manufactured++;
        else if (b.status === 'IN_USE') counts.inUse++;
        else if (b.status === 'COLLECTED') counts.collected++;
        else if (b.status === 'AT_RECYCLER' || b.status === 'RECEIVED_BY_RECYCLER') counts.receivedByRecycler++;
        else if (b.status === 'RECYCLED') counts.recycled++;
        else if (b.status === 'EPR_CERTIFIED') {
          counts.recycled++;
          counts.eprCertified++;
        }

        if (chemistryBreakdown[b.chemistry] !== undefined) {
          chemistryBreakdown[b.chemistry]++;
        } else {
          chemistryBreakdown.OTHER++;
        }

        totalGrossWeightKg += (b.weightKg || 0);
        if (b.status === 'RECYCLED' || b.status === 'EPR_CERTIFIED') {
          totalRecycledWeightKg += (b.weightKg || 0);
        }
      }

      // Aggregate recovered materials from certificates
      let totalLeadRecoveredKg = 0;
      let totalLithiumRecoveredKg = 0;
      let totalCobaltRecoveredKg = 0;
      let totalPlasticsRecoveredKg = 0;
      let totalEprCreditsIssued = 0;

      for (const c of certificates) {
        totalEprCreditsIssued += (c.eprCreditPoints || 0);
        if (c.recoveredMaterials) {
          totalLeadRecoveredKg += (c.recoveredMaterials.recoveredLeadKg || 0);
          totalLithiumRecoveredKg += (c.recoveredMaterials.recoveredLithiumKg || 0);
          totalCobaltRecoveredKg += (c.recoveredMaterials.recoveredCobaltKg || 0);
          totalPlasticsRecoveredKg += (c.recoveredMaterials.recoveredPlasticsKg || 0);
        }
      }

      const complianceRate = counts.totalRegistered > 0
        ? +((counts.eprCertified / counts.totalRegistered) * 100).toFixed(1)
        : 0;

      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        networkStatus: status,
        metrics: {
          counts,
          chemistryBreakdown,
          totalGrossWeightKg: +totalGrossWeightKg.toFixed(2),
          totalRecycledWeightKg: +totalRecycledWeightKg.toFixed(2),
          complianceRatePct: complianceRate,
          materialsRecovered: {
            leadKg: +totalLeadRecoveredKg.toFixed(2),
            lithiumKg: +totalLithiumRecoveredKg.toFixed(2),
            cobaltKg: +totalCobaltRecoveredKg.toFixed(2),
            plasticsKg: +totalPlasticsRecoveredKg.toFixed(2)
          },
          totalEprCreditsIssued: +totalEprCreditsIssued.toFixed(2),
          activeRecyclersCount: recyclers.length
        }
      });
    } catch (err) {
      console.error('[RegulatorController] getDashboardMetrics error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getLedgerBlocks(req, res) {
    try {
      const limit = parseInt(req.query.limit || '50', 10);
      const blocks = await fabricGateway.getBlocks(limit);
      return res.json({
        success: true,
        count: blocks.length,
        blocks
      });
    } catch (err) {
      console.error('[RegulatorController] getLedgerBlocks error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = RegulatorController;
