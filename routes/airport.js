// routes/airport.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Airport = require('../models/Airport');
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const Location = require('../models/Location');
const Country = require('../models/Country');
const Region = require('../models/Region');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');



// GET all

router.get('/', async (req, res) => {
    try {
        const pageParam = req.query.page;
        const sizeParam = req.query.size;

        // if neither page nor size provided, return all
        if (pageParam == null && sizeParam == null) {
            const all = await Airport.find()
                .populate({
                    path: 'location',
                    select: 'name country',
                    populate: {
                        path: 'country',
                        select: 'name region',
                        populate: { path: 'region', select: 'name' }
                    }
                });
            return res.json(all);
        }

        // parse pagination
        const page = pageParam != null
            ? Math.max(1, parseInt(pageParam, 10) || 1)
            : 1;
        const size = sizeParam != null
            ? Math.max(1, parseInt(sizeParam, 10) || 50)
            : 50;

        const totalDocuments = await Airport.countDocuments();
        const totalPages = Math.max(1, Math.ceil(totalDocuments / size));
        const currentPage = Math.min(page, totalPages);
        const skipCount = (currentPage - 1) * size;

        const docs = await Airport.find()
            .populate({
                path: 'location',
                select: 'name country',
                populate: {
                    path: 'country',
                    select: 'name region',
                    populate: { path: 'region', select: 'name' }
                }
            })
            .skip(skipCount)
            .limit(size);

        return res.json({
            currentPage,
            totalPages,
            totalDocuments,
            results: docs
        });
    } catch (err) {
        console.error('Error fetching airports:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get('/search-advanced', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json([]);

        // build regex once
        const regex = new RegExp(q, 'i');
        const qLower = q.toLowerCase();

        // 1) direct airport matches
        let airportsA = await Airport.find({
            $or: [{ name: regex }, { code: regex }]
        }).populate({
            path: 'location',
            populate: { path: 'country', populate: 'region' }
        });

        // 2) location-based matches
        const locsByName = await Location.find({ name: regex });
        const countries = await Country.find({ name: regex });
        const regions = await Region.find({ name: regex });

        const locIds = new Set();
        locsByName.forEach(l => locIds.add(l._id.toString()));
        for (const c of countries) {
            const locs = await Location.find({ country: c._id });
            locs.forEach(l => locIds.add(l._id.toString()));
        }
        for (const r of regions) {
            const cs = await Country.find({ region: r._id });
            for (const c of cs) {
                const locs = await Location.find({ country: c._id });
                locs.forEach(l => locIds.add(l._id.toString()));
            }
        }

        let airportsB = await Airport.find({
            location: { $in: Array.from(locIds) }
        }).populate({
            path: 'location',
            populate: { path: 'country', populate: 'region' }
        });

        // dedupe
        const seen = new Set(airportsA.map(a => a._id.toString()));
        airportsB = airportsB.filter(a => !seen.has(a._id.toString()));

        // tag & group
        const allTagged = [
            ...airportsA.map(a => ({ doc: a, by: 'airport' })),
            ...airportsB.map(a => ({ doc: a, by: 'location' }))
        ];

        const group1A = [], group1B = [], group2A = [], group2B = [];
        for (const { doc: a, by } of allTagged) {
            const fields = [
                a.name, a.code,
                a.location.name,
                a.location.country.name,
                a.location.country.region.name
            ];
            const starts = fields.some(f => f.toLowerCase().startsWith(qLower));
            if (starts) {
                by === 'airport' ? group1A.push(a) : group1B.push(a);
            } else {
                by === 'airport' ? group2A.push(a) : group2B.push(a);
            }
        }

        const sortAlpha = arr => arr.sort((x, y) => x.name.localeCompare(y.name));
        sortAlpha(group1A); sortAlpha(group1B);
        sortAlpha(group2A); sortAlpha(group2B);

        const final = [...group1A, ...group1B, ...group2A, ...group2B]
            .map(a => ({
                airportId: a._id,
                airportName: a.name,
                airportCode: a.code,
                locationId: a.location._id,
                locationName: a.location.name,
                countryId: a.location.country._id,
                countryName: a.location.country.name,
                regionId: a.location.country.region._id,
                regionName: a.location.country.region.name
            }));

        // pagination
        const pageParam = req.query.page;
        const sizeParam = req.query.size;

        if (pageParam == null && sizeParam == null) {
            return res.json(final);
        }

        const page = pageParam != null
            ? Math.max(1, parseInt(pageParam, 10) || 1)
            : 1;
        const size = sizeParam != null
            ? Math.max(1, parseInt(sizeParam, 10) || 50)
            : 50;

        const totalDocuments = final.length;
        const totalPages = Math.max(1, Math.ceil(totalDocuments / size));
        const currentPage = Math.min(page, totalPages);
        const start = (currentPage - 1) * size;
        const results = final.slice(start, start + size);

        return res.json({
            currentPage,
            totalPages,
            totalDocuments,
            results
        });
    } catch (err) {
        console.error('Error in search-advanced:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get('/by-location/:locationId/ids', async (req, res) => {
    const { locationId } = req.params;
    if (!locationId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid locationId' });
    }
    const airports = await Airport.find(
        { location: locationId },
        '_id'
    );
    const ids = airports.map(a => a._id.toString());
    res.json(ids);
});


router.get('/by-location/:locationId', async (req, res) => {
    const { locationId } = req.params;
    if (!locationId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid locationId' });
    }
    const airports = await Airport.find({ location: locationId });
    res.json(airports);
});


router.get('/:id/usage', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid airport id' });
        }

        // 1) Does any flight use this airport?
        const usedInFlights = await Flight.exists({
            $or: [
                { departureAirport: id },
                { arrivalAirport: id }
            ]
        });

        // 2) If it's not in any flight, it can't be in any booking
        let usedInBookings = false;
        if (usedInFlights) {
            // find all flight IDs that reference this airport
            const flights = await Flight.find({
                $or: [
                    { departureAirport: id },
                    { arrivalAirport: id }
                ]
            }, '_id').lean();
            const flightIds = flights.map(f => f._id);
            // check bookings for any of those flights
            usedInBookings = await Booking.exists({ flight: { $in: flightIds } });
        }

        res.json({
            usedInFlights: Boolean(usedInFlights),
            usedInBookings: Boolean(usedInBookings)
        });
    } catch (err) {
        console.error('Error checking airport usage:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
);

// GET /api/airport/:id
router.get('/:id', async (req, res) => {
    try {
        const a = await Airport.findById(req.params.id)
            .populate({
                path: 'location',
                select: 'name',
                populate: {
                    path: 'country',
                    select: 'name',
                    populate: {
                        path: 'region',
                        select: 'name'
                    }
                }
            });

        if (!a) {
            return res.status(404).json({ message: 'Not found' });
        }

        res.json(a);
    } catch (err) {
        console.error('Error fetching airport:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const a = await Airport.create(req.body);
        res.status(201).json(a);
    } catch (e) {
        if (e.code === 11000) {
            return res.status(409).json({ error: 'Airport code already in use', field: 'code' });
        }
        res.status(400).json({ error: e.message });
    }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const a = await Airport.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!a) return res.status(404).json({ error: 'Not found' });
        res.json(a);
    } catch (e) {
        if (e.code === 11000) {
            return res.status(409).json({ error: 'Airport code already in use', field: 'code' });
        }
        res.status(400).json({ error: e.message });
    }
});



router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
    const a = await Airport.findByIdAndDelete(req.params.id);
    if (!a) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
});

router.get(
    '/:id/usage',
    authenticate, authorizeAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: 'Invalid airport id' });
            }

            // 1) Does any flight use this airport?
            const usedInFlights = await Flight.exists({
                $or: [
                    { departureAirport: id },
                    { arrivalAirport: id }
                ]
            });

            // 2) If it's not in any flight, it can't be in any booking
            let usedInBookings = false;
            if (usedInFlights) {
                // find all flight IDs that reference this airport
                const flights = await Flight.find({
                    $or: [
                        { departureAirport: id },
                        { arrivalAirport: id }
                    ]
                }, '_id').lean();
                const flightIds = flights.map(f => f._id);
                // check bookings for any of those flights
                usedInBookings = await Booking.exists({ flight: { $in: flightIds } });
            }

            res.json({
                usedInFlights: Boolean(usedInFlights),
                usedInBookings: Boolean(usedInBookings)
            });
        } catch (err) {
            console.error('Error checking airport usage:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);


router.patch(
    '/:id/departure',
    authenticate, authorizeAdmin,
    async (req, res) => {
        const { isDeparture } = req.body;
        try {
            const a = await Airport.findByIdAndUpdate(
                req.params.id,
                { isDeparture },
                { new: true, runValidators: true }
            );
            if (!a) return res.status(404).json({ message: 'Not found' });
            res.json(a);
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    }
);


module.exports = router;
