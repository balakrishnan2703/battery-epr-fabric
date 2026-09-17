'use strict';

const fabricGateway = require('../fabric/gateway');

class RecyclerController {
  static async getAuthorizedRecyclers(req, res) {
    try {
      const recyclersStr = await fabricGateway.evaluateTransaction('GetAuthorizedRecyclers');
      const recyclers = JSON.parse(recyclersStr);
      return res.json({
        success: true,
        count: recyclers.length,
        recyclers
      });
    } catch (err) {
      console.error('[RecyclerController] getAuthorizedRecyclers error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = RecyclerController;
