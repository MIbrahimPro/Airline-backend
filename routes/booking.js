// routes/booking.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SiteInfo = require('../models/SiteInfo');
const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Airport = require('../models/Airport');
const Airline = require('../models/Airline');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

const transporter = require('../utils/mailer');

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];



function isPast(date) {
    const today = new Date();
    return date < today;
}

// GET /api/booking?page=<n>&limit=<m>
router.get('/', authenticate, authorizeAdmin, async (req, res) => {
    try {
        // parse pagination params, default to page 1, limit 10
        const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
        const skip = (pageNum - 1) * limit;

        // 1) cancel any past‑departure pending bookings
        const allPending = await Booking.find({ state: 'pending' });
        const now = new Date();
        await Promise.all(allPending.map(async b => {
            if (isPast(b.departureDate)) {
                b.state = 'cancelled';
                await b.save();
            }
        }));

        // 2) fetch paginated page of bookings with flight info
        const [docs, totalDocuments] = await Promise.all([
            Booking.find()
                .skip(skip)
                .limit(limit)
                .populate({
                    path: 'flight',
                    populate: ['departureAirport', 'arrivalAirport', 'airline']
                }),
            Booking.countDocuments()
        ]);

        // 3) strip time‑of‑day and format dates as YYYY‑MM‑DD
        const results = docs.map(b => {
            const o = b.toObject();
            o.departureDate = o.departureDate.toISOString().split('T')[0];
            o.returnDate = o.returnDate.toISOString().split('T')[0];
            return o;
        });

        // 4) compute total pages
        const totalPages = Math.ceil(totalDocuments / limit);

        // 5) return paginated payload
        return res.json({
            currentPage: pageNum,
            totalPages,
            totalDocuments,
            results
        });
    } catch (err) {
        console.error('Error fetching bookings with pagination:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.get('/filter', authenticate, authorizeAdmin, async (req, res) => {
    try {
        let {
            airline,
            departureAirport,
            arrivalAirport,
            state,
            page = 1,
            limit = 10
        } = req.query;

        // Normalize query parameters
        const airlines = Array.isArray(airline)
            ? airline.map(a => a.trim()).filter(Boolean)
            : airline
                ? [airline.trim()]
                : [];

        departureAirport = departureAirport?.trim() || undefined;
        arrivalAirport = arrivalAirport?.trim() || undefined;
        state = state?.trim() || undefined;

        // Build flight-level filters
        const flightFilter = {};
        if (airlines.length) flightFilter.airline = { $in: airlines };
        if (departureAirport) flightFilter.departureAirport = departureAirport;
        if (arrivalAirport) flightFilter.arrivalAirport = arrivalAirport;

        // Initialize booking filter
        const filter = {};

        if (Object.keys(flightFilter).length) {
            const matchingFlights = await Flight.find(flightFilter, '_id');
            const flightIds = matchingFlights.map(f => f._id);
            if (!flightIds.length) {
                return res.json({
                    currentPage: parseInt(page, 10),
                    totalPages: 0,
                    totalDocuments: 0,
                    results: []
                });
            }
            filter.flight = { $in: flightIds };
        }

        if (state) filter.state = state;

        // Pagination
        const skip = (page - 1) * limit;
        const [docs, totalDocuments] = await Promise.all([
            Booking.find(filter)
                .skip(skip)
                .limit(parseInt(limit, 10))
                .populate({
                    path: 'flight',
                    populate: ['departureAirport', 'arrivalAirport', 'airline']
                }),
            Booking.countDocuments(filter)
        ]);

        // Format dates
        const results = docs.map(b => {
            const o = b.toObject();
            o.departureDate = o.departureDate.toISOString().split('T')[0];
            o.returnDate = o.returnDate.toISOString().split('T')[0];
            return o;
        });

        const totalPages = Math.ceil(totalDocuments / limit);

        return res.json({
            currentPage: parseInt(page, 10),
            totalPages,
            totalDocuments,
            results
        });
    } catch (err) {
        console.error('Error fetching filtered bookings:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});


router.get('/analytics', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const now = new Date();

        // 1) TOTAL BOOKINGS
        const totalBookings = await Booking.countDocuments();

        // 2) BY STATE (must match your enum exactly)
        const states = ['pending', 'cancelled', 'confirmed', 'in-progress'];
        const byState = {};
        await Promise.all(
            states.map(async st => {
                byState[st] = await Booking.countDocuments({ state: st });
            })
        );

        // 3) TOP 3 FLIGHTS (populate to get names)
        const allBookings = await Booking.find()
            .populate({
                path: 'flight',
                populate: [
                    { path: 'departureAirport', select: 'name' },
                    { path: 'arrivalAirport', select: 'name' },
                    { path: 'airline', select: 'shortName' }
                ]
            })
            .select('flight');

        const freq = {};
        for (let b of allBookings) {
            const f = b.flight;
            if (!f) continue;
            const id = f._id.toString();
            if (!freq[id]) freq[id] = { flight: f, count: 0 };
            freq[id].count++;
        }

        const topFlights = Object.values(freq)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(({ flight, count }) => ({
                departure: flight.departureAirport.name,
                arrival: flight.arrivalAirport.name,
                airline: flight.airline.shortName,    // ← now includes airline name
                bookingsCount: count
            }));

        // 4) UPCOMING 7‑DAY BOOKINGS
        const inSeven = new Date(now);
        inSeven.setDate(now.getDate() + 7);
        const upcoming7Days = await Booking.countDocuments({
            departureDate: { $gte: now, $lte: inSeven }
        });

        // helper to key by “YYYY-M”
        const ymKey = dt => `${dt.getFullYear()}-${dt.getMonth() + 1}`;

        // 5 & 6) load minimal data for both monthly series
        const mini = await Booking.find().select('createdAt departureDate peopleCount');

        const salesMap = {}, departMap = {};
        for (let b of mini) {
            const k1 = ymKey(b.createdAt);
            salesMap[k1] = (salesMap[k1] || 0) + 1;
            const k2 = ymKey(b.departureDate);
            const ppl = b.peopleCount.adults + b.peopleCount.children + b.peopleCount.infants;
            departMap[k2] = (departMap[k2] || 0) + ppl;
        }

        // Build last‑12‑months (zero‑filled)
        const bookingsLast12Months = [];
        let cursor = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        for (let i = 0; i < 12; i++) {
            const y = cursor.getFullYear(), m = cursor.getMonth() + 1, key = `${y}-${m}`;
            bookingsLast12Months.push({
                year: y,
                month: m,
                salesCount: salesMap[key] || 0,
                departingThisMonth: departMap[key] || 0
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }

        // Build all‑time from earliest → latest (including future months)
        // find min/max keys
        const allKeys = Object.keys(salesMap).concat(Object.keys(departMap));
        if (allKeys.length === 0) {
            // no bookings at all
            bookingsAllTime = [];
        } else {
            const ymPairs = allKeys
                .map(k => k.split('-').map(Number))
                .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const [minY, minM] = ymPairs[0], [maxY, maxM] = ymPairs[ymPairs.length - 1];
            const bookingsAllTime = [];
            let cur = new Date(minY, minM - 1, 1);
            const end = new Date(maxY, maxM - 1, 1);
            while (cur <= end) {
                const y = cur.getFullYear(), m = cur.getMonth() + 1, key = `${y}-${m}`;
                bookingsAllTime.push({
                    year: y,
                    month: m,
                    salesCount: salesMap[key] || 0,
                    departingThisMonth: departMap[key] || 0
                });
                cur.setMonth(cur.getMonth() + 1);
            }
            // send response
            return res.json({
                totalBookings,
                byState,
                topFlights,
                upcoming7Days,
                bookingsLast12Months,
                bookingsAllTime
            });
        }

        // if we fell through (no bookings)
        res.json({
            totalBookings,
            byState,
            topFlights,
            upcoming7Days,
            bookingsLast12Months,
            bookingsAllTime: []
        });
    }
    catch (err) {
        console.error('Analytics error', err);
        res.status(500).json({ message: 'Server error fetching analytics' });
    }
});

router.get('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const b = await Booking.findById(req.params.id)
            .populate({
                path: 'flight',
                populate: ['departureAirport', 'arrivalAirport', 'airline']
            });
        if (!b) return res.status(404).json({ message: 'Not found' });

        if (b.state === 'pending' && isPast(b.departureDate)) {
            b.state = 'cancelled';
            await b.save();
        }

        const o = b.toObject();
        o.departureDate = o.departureDate.toISOString().split('T')[0];
        o.returnDate = o.returnDate.toISOString().split('T')[0];
        return res.json(o);

    } catch (err) {
        console.error('Error fetching booking:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});

function parseLocalDate(dateStr) {
    const [dateOnly] = dateStr.split('T');
    const [y, m, d] = dateOnly.split('-').map(Number);
    return new Date(y, m - 1, d);
}

router.post('/', async (req, res) => {
    try {
        const {
            customerName, flightId, userEmail, contactPhone,
            contactPreference, adults, children = 0, infants = 0,
            extraDetails = '', departureDate, returnDate, initialBookingPrice
        } = req.body;

        if (!customerName || !flightId || !userEmail
            || !contactPreference || !adults
            || !departureDate || !returnDate || initialBookingPrice == null
        ) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        console.log(departureDate, returnDate)

        const dep = parseLocalDate(departureDate);
        const ret = parseLocalDate(returnDate);

        console.log(dep, ret);

        console.log(
            dep.getFullYear(),
            dep.getMonth() + 1,
            dep.getDate(),
            dep.getHours()
        );

        if (isNaN(dep) || isNaN(ret) || ret <= dep) {
            return res.status(400).json({ message: 'Invalid departureDate/returnDate' });
        }


        if (isNaN(dep) || isNaN(ret) || ret <= dep) {
            return res.status(400).json({ message: 'Invalid departureDate/returnDate' });
        }

        const booking = await Booking.create({
            customerName,
            flight: flightId,
            userEmail,
            contactPhone: contactPhone || '0',
            contactPreference,
            peopleCount: {
                adults: parseInt(adults, 10),
                children: parseInt(children, 10),
                infants: parseInt(infants, 10)
            },
            extraDetails,
            departureDate: dep,
            returnDate: ret,
            initialBookingPrice: parseFloat(initialBookingPrice),
            finalPrice: parseFloat(req.body.finalPrice) || 0,
            state: req.body.state || 'pending',
            notes: req.body.notes || ''
        });










        const flight = await Flight.findById(flightId)
            .populate('departureAirport', 'name')
            .populate('arrivalAirport', 'name');

        // Format dates: DD MMMM YYYY
        const formatOpts = { day: '2-digit', month: 'long', year: 'numeric' };
        const depStr = new Date(dep).toLocaleDateString('en-GB', formatOpts);
        const retStr = new Date(ret).toLocaleDateString('en-GB', formatOpts);

        // Fetch contact info
        const site = await SiteInfo.findOne().lean() || {};
        const adminEmail = process.env.EMAIL_USER;

        // — Notify Admin (plain text)
        await transporter.sendMail({
            from: `"Booking System" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: '🛫 New Booking Received',
            text: `
New booking by ${customerName}

Flight: ${flight.departureAirport.name} → ${flight.arrivalAirport.name}
Trip dates: ${depStr} – ${retStr}
Passengers: Adults ${adults}, Children ${children}, Infants ${infants}
Price: ${initialBookingPrice.toFixed(2)}

Contact: ${contactPhone} (${contactPreference})
Details: ${extraDetails}
      `.trim()
        });

        // — Confirmation to Customer (styled HTML)
        const html = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
      <h1 style="background:#0066cc;color:#fff;padding:15px;border-radius:4px;text-align:center;">
        Booking Confirmed!
      </h1>

      <p>Hi <strong>${customerName}</strong>,</p>
      <p>Thanks for booking with us. Here are your trip details:</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Route</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">
            ${flight.departureAirport.name} → ${flight.arrivalAirport.name}
          </td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Departure</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${depStr}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Return</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">${retStr}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Passengers</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">
            Adults: ${adults}, Children: ${children}, Infants: ${infants}
          </td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #ddd;"><strong>Price</strong></td>
          <td style="padding:8px;border:1px solid #ddd;">USD ${initialBookingPrice.toFixed(2)}</td>
        </tr>
      </table>

      <p style="margin:20px 0;">If you have any questions, reach us at:</p>
      <p>
        ✉️ <a href="mailto:${site.contactEmail}">${site.contactEmail}</a><br/>
        📞 <a href="tel:${site.contactPhone}">${site.contactPhone}</a><br/>
        💬 <a href="https://wa.me/${site.contactWA.replace(/\D/g, '')}">${site.contactWA}</a>
      </p>

      <p style="margin-top:30px;color:#777;font-size:0.9em;">
        We look forward to making your journey unforgettable!
      </p>
    </div>
    `;
        await transporter.sendMail({
            from: `"Flyva Support" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: 'Your Booking Details',
            html
        });











        return res.status(201).json(booking);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }


}
);

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        const b = await Booking.findById(req.params.id);
        if (!b) return res.status(404).json({ message: 'Not found' });

        console.log(req.body)

        // departureDate / returnDate
        let depDate = b.departureDate;
        if (req.body.departureDate) {
            const d = new Date(req.body.departureDate);
            if (isNaN(d)) {
                return res.status(400).json({ message: 'Invalid departureDate' });
            }
            b.departureDate = d;
            depDate = d;
        }
        if (req.body.returnDate) {
            const r = new Date(req.body.returnDate);
            if (isNaN(r) || r <= depDate) {
                return res.status(400).json({ message: 'Invalid returnDate' });
            }
            b.returnDate = r;
        }

        // flight update
        const { departureCode, arrivalCode, airlineShortName } = req.body;


        if (departureCode || arrivalCode || airlineShortName) {
            try {
                const month = monthNames[depDate.getMonth()];

                // Lookup references
                const departureAirport = await Airport.findOne({ code: departureCode });
                const arrivalAirport = await Airport.findOne({ code: arrivalCode });
                const airline = await Airline.findOne({ shortName: airlineShortName });

                if (!arrivalAirport) {
                    return res.status(400).json({ message: 'Invalid arrival airport code given' });
                }
                if (!departureAirport) {
                    return res.status(400).json({ message: 'Invalid departure airport code given' });
                }
                if (!airline) {
                    return res.status(400).json({ message: 'Invalid airline shortname given' });
                }

                let flight = await Flight.findOne({
                    departureAirport: departureAirport._id,
                    arrivalAirport: arrivalAirport._id,
                    airline: airline._id
                });

                let created = false;
                if (!flight) {
                    // Build empty 12-month prices
                    const prices = [
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                    ].map(m => ({
                        month: m, oneWay: 1, roundTrip: 1,
                        discount: { oneWay: 0, roundTrip: 0 }
                    }));

                    flight = await Flight.create({
                        departureAirport: departureAirport._id,
                        arrivalAirport: arrivalAirport._id,
                        airline: airline._id,
                        prices,
                        time: { hours: 0, minutes: 1 }
                    });
                    created = true;
                }

                const priceEntry = flight.prices.find(p => p.month === month);

                b.flight = flight._id;
                if (created) {
                    b._flightCreated = true;
                }

            } catch (error) {
                console.error('Error in findOrCreateFlight:', error);
                return res.status(500).json({ message: 'Error finding or creating flight' });
            }
        }

        // peopleCount
        if (req.body.peopleCount) {
            b.peopleCount = req.body.peopleCount;

        }

        // state, finalPrice, notes
        if (req.body.state) {
            b.state = req.body.state;
        }
        if (req.body.finalPrice != null) {
            b.finalPrice = req.body.finalPrice;
        }
        if (req.body.notes != null) {
            b.notes = req.body.notes;
        }

        await b.save();
        const out = b.toObject();
        if (b._flightCreated) {
            out.newFlightId = b.flight;
            delete out._flightCreated;
        }
        res.json(out);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
}
);

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
    const b = await Booking.findByIdAndDelete(req.params.id);
    if (!b) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
}
);

module.exports = router;
