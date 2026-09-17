'use strict';

const BatteryStatus = {
  MANUFACTURED: 'MANUFACTURED',
  IN_USE: 'IN_USE',
  COLLECTED: 'COLLECTED',
  AT_RECYCLER: 'AT_RECYCLER',
  RECEIVED_BY_RECYCLER: 'AT_RECYCLER', // Backward compatibility alias
  RECYCLED: 'RECYCLED',
  EPR_CERTIFIED: 'EPR_CERTIFIED'
};

const Chemistries = {
  LITHIUM_ION: 'LITHIUM_ION',
  LEAD_ACID: 'LEAD_ACID',
  NICKEL_CADMIUM: 'NICKEL_CADMIUM',
  OTHER: 'OTHER'
};

module.exports = {
  BatteryStatus,
  Chemistries
};
