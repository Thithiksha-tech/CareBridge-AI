const ai = require('../../../ai');

module.exports = {
  analyzeDischargeText: ai.extractStructuredCarePlan,
  validateDischargeStructure: ai.validateDischargeStructure,
  simplifyMedicalJargon: ai.simplifyMedicalJargon
};
