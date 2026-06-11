const router = require('express').Router();
const { sequelize } = require('../models');

// GET /config
// Returns server-driven feature flags consumed by the mobile/web client.
// ads_enabled is read from app_settings DB; falls back to ADS_ENABLED env var.
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      "SELECT `value` FROM app_settings WHERE `key` = 'ads_enabled' LIMIT 1"
    );
    const adsEnabled = rows.length > 0
      ? rows[0].value === 'true'
      : process.env.ADS_ENABLED === 'true';
    return res.json({
      adsEnabled,
      premiumEnabled: process.env.PREMIUM_ENABLED === 'true',
    });
  } catch {
    return res.json({
      adsEnabled: process.env.ADS_ENABLED === 'true',
      premiumEnabled: process.env.PREMIUM_ENABLED === 'true',
    });
  }
});

module.exports = router;
