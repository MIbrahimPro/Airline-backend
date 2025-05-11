// routes/country.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Country = require('../models/Country');
const Region = require('../models/Region');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

// GET /api/country
router.get('/', async (req, res) => {
    const countries = await Country.find().populate('region', 'name');
    res.json(countries);
});

router.get('/region/:regionId', async (req, res) => {
    const { regionId } = req.params;
    const region = await Region.findById(regionId);
    if (!region) return res.status(404).json({ message: 'Region not found' });

    const countries = await Country.find({ region: regionId }).populate('region', 'name');
    res.json(
        countries
    );
});

// GET /api/country/:id
router.get('/:id', async (req, res) => {
    const c = await Country.findById(req.params.id).populate('region', 'name');
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json(c);
});


// POST /api/country     (admin)
router.post(
    '/', authenticate, authorizeAdmin,
    async (req, res) => {
        const { name, region } = req.body;
        if (!name || !region?.id || !region?.name) {
            return res.status(400).json({
                message: 'Must provide country name and region { id, name }'
            });
        }
        // verify region exists and name matches
        const regionDoc = await Region.findById(region.id);
        if (!regionDoc || regionDoc.name !== region.name) {
            return res.status(400).json({ message: 'Invalid region id or name' });
        }

        try {
            const c = await Country.create({ name, region: regionDoc._id });
            res.status(201).json({
                id: c._id,
                name: c.name,
                region: { id: regionDoc._id, name: regionDoc.name }
            });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }
);

// PUT /api/country/:id  (admin)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const c = await Country.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!c) return res.status(404).json({ message: 'Not found' });
        res.json(c);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE /api/country/:id (admin)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
    const c = await Country.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
});

module.exports = router;
