const router = require('express').Router();
const { Category } = require('../models');

// GET /categories  — only returns enabled categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({ where: { is_enabled: 1 }, order: [['name', 'ASC']] });
    return res.json({ categories });
  } catch (err) {
    console.error('[categories]', err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
