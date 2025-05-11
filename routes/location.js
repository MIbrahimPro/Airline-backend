
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Location = require('../models/Location');
const Country = require('../models/Country');
const Region = require('../models/Region');
const Airport = require('../models/Airport');
const { deleteFile } = require('../utils/fileUtils');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

// GET all
router.get('/', async (req, res) => {
    try {
        const locs = await Location.find()
            .populate('country', 'name')
            .lean();

        const counts = await Airport.aggregate([
            { $group: { _id: '$location', count: { $sum: 1 } } }
        ]);

        const hasMap = counts.reduce((m, c) => {
            m[c._id.toString()] = c.count > 0;
            return m;
        }, {});

        const result = locs.map(loc => ({
            ...loc,
            hasAirport: !!hasMap[loc._id.toString()]
        }));

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/popular', async (req, res) => {
    const locs = await Location.find({ isPopular: true })
        .populate('country', 'name');
    res.json(locs);
});

router.get('/country/:countryId', async (req, res) => {
    const { countryId } = req.params;
    // you could verify the country exists if you like
    const locs = await Location.find({ country: countryId })
        .populate({
            path: 'country',
            populate: { path: 'region' }
        });
    res.json(locs);
});

router.get('/deals', async (req, res) => {
    try {
        /*=== Fetch each category ===*/
        const lastMinutes = await Location.find({ dealings: 'last-minutes' })
            .populate({ path: 'country', populate: { path: 'region' } });
        const topDestinations = await Location.find({ dealings: 'top-destinations' })
            .populate({ path: 'country', populate: { path: 'region' } });
        const hotDeals = await Location.find({ dealings: 'hot-deals' })
            .populate({ path: 'country', populate: { path: 'region' } });

        /*=== Return grouped arrays ===*/
        return res.json({
            lastMinutes,
            topDestinations,
            hotDeals
        });
    } catch (err) {
        console.error('Error fetching deals:', err);
        return res.status(500).json({ message: 'Server error fetching deals' });
    }
});

router.get('/region/:regionId', async (req, res) => {
    const { regionId } = req.params;
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const size = req.query.size ? parseInt(req.query.size, 10) : null;

    // find all countries in this region
    const countries = await Country.find({ region: regionId }, '_id');
    const countryIds = countries.map(c => c._id);

    const filter = { country: { $in: countryIds } };

    // If both pagination params are missing, return all results (no pagination)
    if (page === null && size === null) {
        const locs = await Location.find(filter)
            .populate({
                path: 'country',
                populate: { path: 'region' }
            });
        return res.json(locs);
    }

    // If only one is missing, apply default values
    const pageNum = page > 0 ? page : 1;
    const sizeNum = size > 0 ? size : 20;

    const totalDocuments = await Location.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalDocuments / sizeNum));
    const currentPage = Math.min(Math.max(1, pageNum), totalPages);

    const locs = await Location.find(filter)
        .skip((currentPage - 1) * sizeNum)
        .limit(sizeNum)
        .populate({
            path: 'country',
            populate: { path: 'region' }
        });

    res.json({
        currentPage,
        totalPages,
        totalDocuments,
        results: locs
    });
});


router.get('/search', async (req, res) => {
    try {
        const qParam = (req.query.q || '').trim();
        const countryId = req.query.countryId?.trim();
        const detail = req.query.detail === 'true';
        const pageParam = req.query.page;
        const sizeParam = req.query.size;

        if (countryId && !mongoose.isValidObjectId(countryId)) {
            return res.status(400).json({ message: 'Invalid countryId' });
        }

        // 1) Gather matching Location docs
        let resultsMap = new Map();

        if (qParam) {
            const regex = new RegExp(qParam, 'i');

            // by location name
            const locsByName = await Location.find({ name: regex })
                .populate({ path: 'country', populate: 'region' });
            locsByName.forEach(l => resultsMap.set(l._id.toString(), l));

            // by country name
            const countries = await Country.find({ name: regex });
            if (countries.length) {
                const countryIds = countries.map(c => c._id);
                const locs = await Location.find({ country: { $in: countryIds } })
                    .populate({ path: 'country', populate: 'region' });
                locs.forEach(l => resultsMap.set(l._id.toString(), l));
            }

            // by region name
            const regions = await Region.find({ name: regex });
            if (regions.length) {
                const regionIds = regions.map(r => r._id);
                const countriesInReg = await Country.find({ region: { $in: regionIds } });
                const countryIds = countriesInReg.map(c => c._id);
                const locs = await Location.find({ country: { $in: countryIds } })
                    .populate({ path: 'country', populate: 'region' });
                locs.forEach(l => resultsMap.set(l._id.toString(), l));
            }
        } else {
            // no search term → all locations
            const allLocs = await Location.find()
                .populate({ path: 'country', populate: 'region' });
            allLocs.forEach(l => resultsMap.set(l._id.toString(), l));
        }

        // 2) Compile, filter by countryId, sort
        let finalArr = Array.from(resultsMap.values())
            .filter(loc => !countryId || loc.country._id.toString() === countryId)
            .sort((a, b) => a.name.localeCompare(b.name));

        // 3) Map to base response objects (no hasAirports yet)
        const mapped = finalArr.map(loc => {
            const base = {
                locationId: loc._id,
                locationName: loc.name,
                countryId: loc.country._id,
                countryName: loc.country.name,
                regionId: loc.country.region._id,
                regionName: loc.country.region.name
            };
            if (detail) {
                base.image = loc.image;
                base.isPopular = loc.isPopular;
                base.description = loc.description || null;
                base.dealings = loc.dealings;
                base.dealingsDescription = loc.dealingsDescription || null;
            }
            return base;
        });

        // 4) Pagination logic
        if (pageParam == null && sizeParam == null) {
            // no pagination → return all
            return res.json(mapped);
        }
        const page = pageParam != null
            ? Math.max(1, parseInt(pageParam, 10) || 1)
            : 1;
        const size = sizeParam != null
            ? Math.max(1, parseInt(sizeParam, 10) || 50)
            : 50;

        const totalDocuments = mapped.length;
        const totalPages = Math.max(1, Math.ceil(totalDocuments / size));
        const currentPage = Math.min(page, totalPages);
        const startIdx = (currentPage - 1) * size;
        let results = mapped.slice(startIdx, startIdx + size);

        // 5) If detail, add hasAirports flag
        if (detail && results.length) {
            const locIds = results.map(r => new mongoose.Types.ObjectId(r.locationId));
            const counts = await Airport.aggregate([
                { $match: { location: { $in: locIds } } },
                { $group: { _id: '$location', count: { $sum: 1 } } }
            ]);
            const hasMap = counts.reduce((m, c) => {
                m[c._id.toString()] = true;
                return m;
            }, {});
            results = results.map(r => ({
                ...r,
                hasAirports: Boolean(hasMap[r.locationId])
            }));
        }

        // 6) Return paginated response
        return res.json({
            currentPage,
            totalPages,
            totalDocuments,
            results
        });
    } catch (err) {
        console.error('Error in location search:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get('/hasairports/:id', async (req, res) => {
    try {
        const exists = await Airport.exists({ location: req.params.id });
        res.json({ hasAirport: Boolean(exists) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/firstairport/:id', async (req, res) => {
    try {
        // find the first airport for this location
        const airport = await Airport
            .findOne({ location: req.params.id })
            .select('_id code')
            .lean();

        if (airport) {
            res.json({ hasAirport: true, firstAirportId: airport._id.toString(), firstAirportcode: airport.code.toString() });
        } else {
            res.json({ hasAirport: false, firstAirportId: null, firstAirportcode: null });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const loc = await Location.findById(req.params.id)
            .populate('country', 'name')
            .lean();
        if (!loc) return res.status(404).json({ message: 'Not found' });

        const count = await Airport.countDocuments({ location: loc._id });
        loc.hasAirport = count > 0;

        res.json(loc);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST create (admin)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const loc = await Location.create(req.body);
        res.status(201).json(loc);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});


// PUT update (admin)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const oldLoc = await Location.findById(req.params.id);
        if (!oldLoc) return res.status(404).json({ message: 'Not found' });

        const loc = await Location.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        // Delete old image if a new one is provided
        if (req.body.image && req.body.image !== oldLoc.image) {
            deleteFile(oldLoc.image);
        }

        res.json(loc);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE (admin)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const loc = await Location.findByIdAndDelete(req.params.id);
        if (!loc) return res.status(404).json({ message: 'Not found' });

        // Delete associated image file
        if (loc.image) {
            deleteFile(loc.image);
        }

        res.json({ message: 'Deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.patch(
    '/:id/popular',
    authenticate, authorizeAdmin,
    async (req, res) => {
        const { isPopular, description } = req.body;
        if (isPopular && !description) {
            return res.status(400).json({
                message: 'Description required when setting isPopular to true'
            });
        }
        try {
            const loc = await Location.findByIdAndUpdate(
                req.params.id,
                { isPopular, description: isPopular ? description : null },
                { new: true, runValidators: true }
            );
            if (!loc) return res.status(404).json({ message: 'Not found' });
            res.json(loc);
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }
);

router.patch(
    '/:id/dealings',
    authenticate, authorizeAdmin,
    async (req, res) => {
        const { dealings, dealingsDescription } = req.body;
        if (dealings !== 'none' && !dealingsDescription) {
            return res.status(400).json({
                message: 'dealingsDescription required when dealings != none'
            });
        }
        try {
            const loc = await Location.findByIdAndUpdate(
                req.params.id,
                { dealings, dealingsDescription: dealings === 'none' ? null : dealingsDescription },
                { new: true, runValidators: true }
            );
            if (!loc) return res.status(404).json({ message: 'Not found' });
            res.json(loc);
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }
);


module.exports = router;
