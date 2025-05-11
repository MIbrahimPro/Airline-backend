const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const Airline = require('../models/Airline');
const SiteInfo = require('../models/SiteInfo');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');
const emailjs = require('emailjs-com');

const {
    EMAILJS_USER_ID,
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_QUOTE_ADMIN,
    EMAILJS_TEMPLATE_QUOTE_USER
} = process.env;

// Public: submit a quote request
router.post('/', async (req, res) => {
    try {
        const {
            customerName, email, contactPhone,
            tripType, from, to, preferredAirline,
            departureDate, arrivalDate,
            extraDetails = '',
            passengerCount
        } = req.body;

        // Validate required
        if (!customerName || !email || !tripType || !from || !to
            || !departureDate || !passengerCount
        ) {
            console.log("customer name", customerName);
            console.log("email", email);
            console.log("trip type", tripType);
            console.log("from", from);
            console.log("to", to);
            console.log("departure date", departureDate);
            console.log("arrival date", arrivalDate);
            console.log("passenger count", passengerCount);

            return res.status(400).json({
                message:
                    'Missing required fields: customerName, email, tripType, from, to, departureDate, arrivalDate, passengerCount'
            });
        }

        if (tripType !== 'one-way' && tripType !== 'round-trip') {
            return res.status(400).json({
                message: 'Invalid trip type. Please choose one-way or return'
            });
        }
        if (tripType !== 'one-way') {
            if (!arrivalDate) {
                return res.status(400).json({
                    message: "arrival date required for 2 ways"
                });
            }
        }

        // Validate airline ref if provided
        let airlineRef = null;
        if (preferredAirline) {
            airlineRef = await Airline.findById(preferredAirline);
            if (!airlineRef) {
                return res.status(400).json({ message: 'preferredAirline not found' });
            }
        }


        console.log("depart" + departureDate);
        console.log("Arri" + arrivalDate);
        let date = new Date(departureDate)
        console.log("depart" + date);
        date = new Date(arrivalDate)
        console.log("Arri" + date);


        // Create
        const quoteData = {
            customerName,
            email,
            contactPhone,
            tripType,
            from,
            to,
            preferredAirline: airlineRef?._id,
            departureDate: new Date(departureDate),
            extraDetails,
            passengerCount,
        };

        if (tripType === "round-trip") {
            quoteData.arrivalDate = new Date(arrivalDate);
        }

        const quote = await Quote.create(quoteData);


        res.status(201).json(quote);
    } catch (err) {
        console.error('Quote submission error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: get all quotes
router.get(
    '/',
    authenticate, authorizeAdmin,
    async (req, res) => {
        try {
            const all = await Quote.find()
                .populate('preferredAirline', 'shortName');
            res.json(all);
        } catch (err) {
            console.error('Fetch quotes error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// Admin: update quote
router.put(
    '/:id',
    authenticate, authorizeAdmin,
    async (req, res) => {
        try {
            const q = await Quote.findById(req.params.id);
            if (!q) return res.status(404).json({ message: 'Not found' });

            
            const {
                tripType, from, to, preferredAirline,
                departureDate, arrivalDate,
                passengerCount,
                status, price, notes
            } = req.body;

            if (tripType) q.tripType = tripType;
            if (from) q.from = from;
            if (to) q.to = to;

            if (preferredAirline) {
                const a = await Airline.findById(preferredAirline);
                if (!a) return res.status(400).json({ message: 'preferredAirline not found' });
                q.preferredAirline = a._id;
            }

            if (departureDate) q.departureDate = new Date(departureDate);
            if (arrivalDate) q.arrivalDate = new Date(arrivalDate);

            if (passengerCount) q.passengerCount = passengerCount;

            if (status) q.status = status;
            if (price != null) q.price = price;
            if (notes != null) q.notes = notes;

            await q.save();
            const updated = await Quote.findById(q._id)
                .populate('preferredAirline', 'shortName');
            res.json(updated);
        } catch (err) {
            console.error('Update quote error:', err);
            res.status(400).json({ message: err.message });
        }
    }
);

router.delete(
    '/:id',
    authenticate, authorizeAdmin,
    async (req, res) => {
        try {
            const c = await Quote.findByIdAndDelete(req.params.id);
            if (!c) return res.status(404).json({ message: 'Not found' });
            res.json({ message: 'Deleted' });
        } catch (err) {
            console.error('Error deleting quote:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

module.exports = router;
