function validateLeverage(entity, category, leverage) {
  const caps = {
    SEYCHELLES_FSA: { MAJOR_FOREX: 500, CRYPTO: 20 },
    UK_FCA: { MAJOR_FOREX: 30, CRYPTO: 2 }
  };
  
  const entityCaps = caps[entity] || caps.SEYCHELLES_FSA;
  const max = entityCaps[category] || 30;

  if (leverage > max) {
    return { valid: false, message: `Leverage exceeds cap of 1:${max}` };
  }
  return { valid: true };
}

function calculateRequiredMargin(volume, openPrice, leverage) {
  const vol = parseFloat(volume) || 1.0;
  const price = parseFloat(openPrice) || 1.0;
  const lev = parseInt(leverage, 10) || 1;
  return (vol * price) / lev;
}

module.exports = { validateLeverage, calculateRequiredMargin };