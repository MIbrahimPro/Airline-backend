// routes/flight.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Flight = require('../models/Flight');
const Airport = require('../models/Airport');
const Booking = require('../models/Booking');
const Airline = require('../models/Airline');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');




// GET all
router.get('/', async (req, res) => {
    const pageSize = 50; // Number of entries per page
    const page = parseInt(req.query.page) || 1; // Get page number from query, default to 1

    try {
        const totalDocuments = await Flight.countDocuments();

        // Calculate total pages (sets of 50)
        const totalPages = Math.ceil(totalDocuments / pageSize);

        // Fetch the paginated data
        const flights = await Flight.find()
            .populate('departureAirport arrivalAirport airline')
            .skip((page - 1) * pageSize) // Skip documents for previous pages
            .limit(pageSize); // Limit to 50 documents

        // Send response with data and pagination info
        res.json({
            data: flights,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalDocuments: totalDocuments,
                pageSize: pageSize
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching flights', error });
    }
});


router.get('/page/:page', async (req, res) => {
    const pageSize = 50; // Number of entries per page
    const page = parseInt(req.params.page) || 1; // Get page number from URL parameter, default to 1

    try {
        // Get total number of documents
        const totalDocuments = await Flight.countDocuments();

        // Calculate total pages (sets of 50)
        const totalPages = Math.ceil(totalDocuments / pageSize);

        // Fetch the paginated data
        const flights = await Flight.find()
            .populate('departureAirport arrivalAirport airline')
            .skip((page - 1) * pageSize) // Skip documents for previous pages
            .limit(pageSize); // Limit to 50 documents

        // Send response with data and pagination info
        res.json({
            data: flights,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalDocuments: totalDocuments,
                pageSize: pageSize
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching flights', error });
    }
});






async function resolveAirport(idParam, textParam, fieldName) {
    if (idParam) {
        if (!mongoose.isValidObjectId(idParam)) {
            throw new Error(`Invalid ${fieldName}_id`);
        }
        const doc = await Airport.findById(idParam);
        if (!doc) throw new Error(`${fieldName} airport not found`);
        return doc._id;
    }
    if (textParam) {
        let doc = await Airport.findOne({ code: textParam.toUpperCase() });
        if (!doc) {
            doc = await Airport.findOne({ name: new RegExp(textParam, 'i') });
        }
        if (!doc) throw new Error(`${fieldName} airport not found for "${textParam}"`);
        return doc._id;
    }
    return null;
}

async function resolveAirlines(idsParam, textParam) {
    if (idsParam) {
        const ids = idsParam.split(',').map(s => s.trim());
        return ids.map(id => {
            if (!mongoose.isValidObjectId(id)) {
                throw new Error(`Invalid airlines_id: ${id}`);
            }
            return new mongoose.Types.ObjectId(id);
        });
    }
    if (textParam) {
        const names = textParam.split(',').map(s => s.trim());
        const docs = await Airline.find({ shortName: { $in: names } }, '_id');
        if (!docs.length) throw new Error(`No airlines found for "${textParam}"`);
        return docs.map(a => a._id);
    }
    return null;
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

router.get('/filter', async (req, res) => {
    try {
        const {
            type = 'round-trip',
            minPrice,
            maxPrice,
            page = 1,

            from_id,
            to_id,
            airlines_id,

            from: from,
            to: to,
            airlines: airlines,

            depDateStr,
            arrDateStr
        } = req.query;

        // console.log("\n\n\n\n*************************************\n\n\n\n")

        // console.log(req.query);

        // console.log("\n\n\n\n*************************************\n\n\n\n")

        // console.log('type:', type);
        // console.log('minPrice:', minPrice);
        // console.log('maxPrice:', maxPrice);
        // console.log('page:', page);
        // console.log('from_id:', from_id);
        // console.log('to_id:', to_id);
        // console.log('airlines_id:', airlines_id);
        // console.log('fromText:', from);
        // console.log('toText:', to);
        // console.log('airlinesText:', airlines);
        // console.log('departureDateStr:', depDateStr);
        // console.log('arrivalDateStr:', arrDateStr);

        // console.log("\n\n\n\n*************************************\n\n\n\n")


        if (!['one-way', 'round-trip'].includes(type)) {
            return res.status(400).json({ message: 'Invalid type' });
        }



        // console.log("\n\n\n\n***********reached here**************************\n\n\n\n")


        const depId = await resolveAirport(from_id, from, 'from');
        const arrId = await resolveAirport(to_id, to, 'to');
        const airlineIds = await resolveAirlines(airlines_id, airlines);

        // console.log("\n\n\n\n*************************************************\n\n\n\n")

        // console.log('deptId', depId);
        // console.log('arrId', arrId);
        // console.log('airlinesid', airlineIds);

        // console.log("\n\n\n\n*************************************************\n\n\n\n")

        let baseDate = depDateStr ? new Date(depDateStr) : new Date();
        if (depDateStr && isNaN(baseDate)) {
            return res.status(400).json({ message: 'Invalid departureDate; use YYYY-MM-DD' });
        }
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const targetMonth = monthNames[baseDate.getMonth()];

        const minP = parseFloat(minPrice) || 0;
        const maxP = parseFloat(maxPrice) || Infinity;


        // console.log('baseDate', baseDate);
        // console.log('targetMonth', targetMonth);
        // console.log('minP', minP);
        // console.log('maxP', maxP);

        // console.log("\n\n\n\n*************************************************\n\n\n\n")

        // fetch & populate
        let flights = await Flight.find({
            ...(depId ? { departureAirport: depId } : {}),
            ...(arrId ? { arrivalAirport: arrId } : {}),
            ...(airlineIds ? { airline: { $in: airlineIds } } : {})
        })
            .populate('departureAirport', 'name code')
            .populate('arrivalAirport', 'name code')
            .populate('airline', 'shortName monogramPicture');


        // console.log('flights data', flights);

        // console.log("\n\n\n\n*************************************************\n\n\n\n")


        // filter by month/prices
        flights = flights.map(f => {
            const p = f.prices.find(x => x.month === targetMonth);
            if (!p) return null;
            const orig = type === 'one-way' ? p.oneWay : p.roundTrip;
            const disc = type === 'one-way' ? p.discount.oneWay : p.discount.roundTrip;
            const final = orig - disc;
            return { flight: f, orig, disc, final };
        }).filter(x => x && x.final >= minP && x.final <= maxP);

        // sort
        flights.sort((a, b) => a.final - b.final);


        // console.log('flights data after month prices', flights);

        // console.log("\n\n\n\n*************************************************\n\n\n\n")

        // pagination
        const pageSize = 25;
        const totalDocuments = flights.length;
        const totalPages = Math.max(1, Math.ceil(totalDocuments / pageSize));
        let pageNum = parseInt(page, 10) || 1;
        pageNum = Math.max(1, Math.min(pageNum, totalPages));
        const start = (pageNum - 1) * pageSize;
        const slice = flights.slice(start, start + pageSize);

        // cheapest 5%
        const cheapestCount = Math.ceil(totalDocuments * 0.05);
        const cheapestIds = new Set(
            flights.slice(0, cheapestCount).map(x => x.flight._id.toString())
        );

        // build result
        const results = slice.map(({ flight, orig, disc, final }) => {
            // departureDate
            let dd = depDateStr ? baseDate : addDays(new Date(), randInt(5, 15));
            // arrivalDate
            let ad = arrDateStr
                ? new Date(arrDateStr)
                : addMonths(dd, 1);
            return {
                flightId: flight._id,
                airlineId: flight.airline._id,
                airlineName: flight.airline.shortName,
                airlineMono: flight.airline.monogramPicture,
                depAirportId: flight.departureAirport._id,
                depAirportName: flight.departureAirport.name,
                depAirportCode: flight.departureAirport.code,
                arrAirportId: flight.arrivalAirport._id,
                arrAirportName: flight.arrivalAirport.name,
                arrAirportCode: flight.arrivalAirport.code,
                // flightTime: `${flight.time.hours}h ${flight.time.minutes}m`,
                toDuration: `${flight.toDuration.hours}h ${flight.toDuration.minutes}m`,
                fromDuration: `${flight.fromDuration.hours}h ${flight.fromDuration.minutes}m`,
                originalPrice: orig,
                discount: disc,
                finalPrice: final,
                departureDate: {
                    year: dd.getFullYear(),
                    month: dd.getMonth() + 1,
                    day: dd.getDate()
                },
                arrivalDate: {
                    year: ad.getFullYear(),
                    month: ad.getMonth() + 1,
                    day: ad.getDate()
                },
                recommended: cheapestIds.has(flight._id.toString())
            };
        });


        console.log('results', results);

        // console.log("\n\n\n\n*************************************************\n\n\n\n")

        // console.log("trip", type);
        // console.log("current page", pageNum);
        // console.log("total pages", totalPages);
        // console.log("total dosuments", totalDocuments);
        // console.log("\n\n\n\n*************************************************\n\n\n\n")

        res.json({
            tripType: type,
            currentPage: pageNum,
            totalPages,
            totalDocuments,
            results
        });

        // setTimeout(() => {
        //     res.json({
        //         tripType: type,
        //         currentPage: pageNum,
        //         totalPages,
        //         totalDocuments,
        //         results
        //     });
        // }, 5000);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});



router.get(
    '/:id/has-bookings',
    authenticate, authorizeAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: 'Invalid flight id' });
            }
            const flight = await Flight.findById(id).select('_id').lean();
            if (!flight) {
                return res.status(404).json({ message: 'Flight not found' });
            }

            const hasBookings = await Booking.exists({ flight: id });
            res.json({ hasBookings: Boolean(hasBookings) });
        } catch (err) {
            console.error('Error checking flight bookings:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);





router.get('/:id', async (req, res) => {
    const f = await Flight.findById(req.params.id)
        .populate('departureAirport arrivalAirport airline');
    if (!f) return res.status(404).json({ message: 'Not found' });
    res.json(f);
});

// POST create (admin)
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const f = await Flight.create(req.body);
        res.status(201).json(f);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PUT update (admin)
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {

        const updates = {};
        if (req.body.toDuration) updates.toDuration = req.body.toDuration;
        if (req.body.fromDuration) updates.fromDuration = req.body.fromDuration;
        if (req.body.prices) updates.prices = req.body.prices;


        const f = await Flight.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );
        if (!f) return res.status(404).json({ message: 'Not found' });
        res.json(f);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE (admin)
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {

    console.log(req.params.id)
    const f = await Flight.findByIdAndDelete(req.params.id);
    if (!f) return res.status(404).json({ message: 'Not found' });
    console.log("deleted");
    res.status(200).json({ message: 'Deleted' });

});



router.post('/search-or-create', async (req, res) => {
    try {
        const {
            departureCode,
            arrivalCode,
            airlineShortName,
            month,
            departureAirport,  // <-- new param
            arrivalAirport,    // <-- new param
            airline_id         // <-- new param
        } = req.body;

        // 1) Resolve departureAirport document
        let depDoc;
        if (departureAirport) {
            if (!mongoose.isValidObjectId(departureAirport)) {
                return res.status(400).json({ message: 'Invalid departureAirport id' });
            }
            depDoc = await Airport.findById(departureAirport);
        } else if (departureCode) {
            depDoc = await Airport.findOne({ code: departureCode.toUpperCase() });
        }
        if (!depDoc) {
            console.log('departure not found:', departureAirport || departureCode);
            return res.status(400).json({ message: 'Invalid departure airport' });
        }

        // 2) Resolve arrivalAirport document
        let arrDoc;
        if (arrivalAirport) {
            if (!mongoose.isValidObjectId(arrivalAirport)) {
                return res.status(400).json({ message: 'Invalid arrivalAirport id' });
            }
            arrDoc = await Airport.findById(arrivalAirport);
        } else if (arrivalCode) {
            arrDoc = await Airport.findOne({ code: arrivalCode.toUpperCase() });
        }
        if (!arrDoc) {
            console.log('arrival not found:', arrivalAirport || arrivalCode);
            return res.status(400).json({ message: 'Invalid arrival airport' });
        }

        // 3) Resolve airline document
        let alDoc;
        if (airline_id) {
            if (!mongoose.isValidObjectId(airline_id)) {
                return res.status(400).json({ message: 'Invalid airline_id' });
            }
            alDoc = await Airline.findById(airline_id);
        } else if (airlineShortName) {
            alDoc = await Airline.findOne({ shortName: airlineShortName });
        }
        if (!alDoc) {
            console.log('airline not found:', airline_id || airlineShortName);
            return res.status(400).json({ message: 'Invalid airline' });
        }

        // 4) Try to find existing flight
        let flight = await Flight.findOne({
            departureAirport: depDoc._id,
            arrivalAirport: arrDoc._id,
            airline: alDoc._id
        });

        let created = false;
        if (!flight) {
            // build empty 12-month prices
            const prices = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ].map(m => ({
                month: m,
                oneWay: 1,
                roundTrip: 1,
                discount: { oneWay: 0, roundTrip: 0 }
            }));

            flight = await Flight.create({
                departureAirport: depDoc._id,
                arrivalAirport: arrDoc._id,
                airline: alDoc._id,
                prices,
                toDuration: { hours: 0, minutes: 1 },
                fromDuration: { hours: 0, minutes: 1 }
            });
            created = true;
        }

        // 5) Pick out the price entry for the given month (or null)
        let priceEntry = null;
        if (month) {
            priceEntry = flight.prices.find(p => p.month === month) || null;
        }

        res.json({
            flight,
            priceEntry,
            info: created
                ? 'New flight created with zeroed data'
                : 'Existing flight found'
        });
    } catch (err) {
        console.error('search-or-create error', err);
        res.status(500).json({ message: 'Server error' });
    }
});




module.exports = router;





















