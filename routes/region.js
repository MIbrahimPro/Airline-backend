const express = require('express');
const router  = express.Router();
const Region  = require('../models/Region');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

// GET /api/region          → public
router.get('/', async (req, res) => {
  const regions = await Region.find().sort('name');
  res.json(regions);
});

// GET /api/region/:id      → public
router.get('/:id', async (req, res) => {
  const region = await Region.findById(req.params.id);
  if (!region) return res.status(404).json({ message: 'Not found' });
  res.json(region);
});

// POST /api/region         → admin only
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
    try {
      const existingRegion = await Region.findOne({ name: req.body.name });

      if (existingRegion) {
        return res.status(409).json({ message: 'Region with this name already exists.' });
      }

      const newRegion = await Region.create({ name: req.body.name });
      res.status(201).json(newRegion);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

// PUT /api/region/:id      → admin only
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
      const existingRegion = await Region.findOne({ name: req.body.name });

      // Check if a region with the requested new name already exists
      if (existingRegion && existingRegion._id.toString() !== req.params.id) {
        return res.status(409).json({ message: 'Region name already in use.' });
      }

      const updatedRegion = await Region.findByIdAndUpdate(
        req.params.id,
        { name: req.body.name },
        { new: true, runValidators: true }
      );

      if (!updatedRegion) {
        return res.status(404).json({ message: 'Region not found.' });
      }

      res.json(updatedRegion);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

// DELETE /api/region/:id   → admin only
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
    const r = await Region.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Region deleted' });
  }
);

module.exports = router;
