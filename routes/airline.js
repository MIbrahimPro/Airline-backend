
const express = require('express');
const router = express.Router();
const Airline = require('../models/Airline');
const Flight = require('../models/Flight');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');
const { deleteFile } = require('../utils/fileUtils');



// GET /api/airline
router.get('/', async (req, res) => {
    const list = await Airline.find().sort({ createdAt: -1 });
    res.json(list);
});

router.get('/search', async (req, res) => {
    const q = req.query.q || '';
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const size = req.query.size ? parseInt(req.query.size, 10) : null;

    const filter = q.trim() ? { shortName: new RegExp(q.trim(), 'i') } : {};

    // If both pagination params are missing, return all results (no pagination)
    if (page === null && size === null) {
        const airlines = await Airline.find(filter);

        // Check which airlines have flights
        const airlineIds = airlines.map(a => a._id);
        const flightCounts = await Flight.aggregate([
            { $match: { airline: { $in: airlineIds } } },
            { $group: { _id: '$airline', count: { $sum: 1 } } }
        ]);
        const flightMap = flightCounts.reduce((map, fc) => {
            map[fc._id.toString()] = true;
            return map;
        }, {});

        const enriched = airlines.map(a => ({
            ...a.toObject(),
            hasFlights: Boolean(flightMap[a._id.toString()])
        }));

        return res.json(enriched);
    }

    // If only one is missing, apply default values
    const pageNum = page > 0 ? page : 1;
    const sizeNum = size > 0 ? size : 20;

    const totalDocuments = await Airline.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalDocuments / sizeNum));
    const currentPage = Math.min(Math.max(1, pageNum), totalPages);

    const airlines = await Airline.find(filter)
        .skip((currentPage - 1) * sizeNum)
        .limit(sizeNum);

    // Check which airlines have flights
    const airlineIds = airlines.map(a => a._id);
    const flightCounts = await Flight.aggregate([
        { $match: { airline: { $in: airlineIds } } },
        { $group: { _id: '$airline', count: { $sum: 1 } } }
    ]);
    const flightMap = flightCounts.reduce((map, fc) => {
        map[fc._id.toString()] = true;
        return map;
    }, {});

    const enriched = airlines.map(a => ({
        ...a.toObject(),
        hasFlights: Boolean(flightMap[a._id.toString()])
    }));

    res.json({
        currentPage,
        totalPages,
        totalDocuments,
        results: enriched
    });
});


// GET by ID
router.get('/:id', async (req, res) => {
    const a = await Airline.findById(req.params.id);
    if (!a) return res.status(404).json({ message: 'Not found' });
    res.json(a);
});

// POST (admin)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const a = await Airline.create(req.body);
        res.status(201).json(a);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});


router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const oldAirline = await Airline.findById(req.params.id);
        if (!oldAirline) return res.status(404).json({ message: 'Not found' });

        const a = await Airline.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        // Delete old images if new ones are provided
        if (req.body.logoPicture && req.body.logoPicture !== oldAirline.logoPicture) {
            deleteFile(oldAirline.logoPicture);
        }
        if (req.body.monogramPicture && req.body.monogramPicture !== oldAirline.monogramPicture) {
            deleteFile(oldAirline.monogramPicture);
        }

        res.json(a);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// DELETE (admin)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
      const a = await Airline.findByIdAndDelete(req.params.id);
      if (!a) return res.status(404).json({ message: 'Not found' });
  
      // Delete associated image files
      if (a.logoPicture) {
        deleteFile(a.logoPicture);
      }
      if (a.monogramPicture) {
        deleteFile(a.monogramPicture);
      }
  
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

module.exports = router;