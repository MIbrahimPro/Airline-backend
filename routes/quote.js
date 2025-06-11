const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const Airline = require('../models/Airline');
const SiteInfo = require('../models/SiteInfo');
const transporter = require('../utils/mailer');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

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
        || !departureDate || !passengerCount) {
      return res.status(400).json({
        message:
          'Missing required fields: customerName, email, tripType, from, to, departureDate, arrivalDate (if round-trip), passengerCount'
      });
    }

    if (tripType !== 'one-way' && tripType !== 'round-trip') {
      return res.status(400).json({ message: 'Invalid trip type. Please choose one-way or round-trip' });
    }

    if (tripType === 'round-trip' && !arrivalDate) {
      return res.status(400).json({ message: 'arrivalDate is required for round-trip' });
    }

    // Validate airline ref if provided
    let airlineRef = null;
    if (preferredAirline) {
      airlineRef = await Airline.findById(preferredAirline);
      if (!airlineRef) {
        return res.status(400).json({ message: 'preferredAirline not found' });
      }
    }

    // Create quote
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
    if (tripType === 'round-trip') {
      quoteData.arrivalDate = new Date(arrivalDate);
    }

    const quote = await Quote.create(quoteData);

    // Format date strings
    const fmtOpts = { day: '2-digit', month: 'long', year: 'numeric' };
    const depStr = new Date(departureDate)
      .toLocaleDateString('en-GB', fmtOpts);
    const arrStr = tripType === 'round-trip'
      ? new Date(arrivalDate).toLocaleDateString('en-GB', fmtOpts)
      : null;

    const site = await SiteInfo.findOne().lean() || {};

    // — Notify Admin
    try {
      await transporter.sendMail({
        from: `"Quote Request" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: '📋 New Quote Request',
        text: `
New quote by ${customerName}

Email: ${email}
Type: ${tripType}
Route: ${from} → ${to}
Departure: ${depStr}
${arrStr ? `Return: ${arrStr}` : ''}
Passengers: Adults: ${passengerCount.adults}, Children: ${passengerCount.children}, Infants: ${passengerCount.infants}
Extra: ${extraDetails}

Contact: ${contactPhone}
        `.trim()
      });
    } catch (emailErr) {
      console.warn('⚠️  Admin quote email failed:', emailErr.message);
    }

    // — Confirmation to Customer (styled HTML)
    const html = `
<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
  <h1 style="background:#28a745;color:#fff;padding:15px;border-radius:4px;text-align:center;">
    Quote Request Received
  </h1>
  <p>Hi <strong>${customerName}</strong>,</p>
  <p>Your quote request has been received. Here’s what you asked for:</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr>
      <td style="padding:8px;border:1px solid #ddd;"><strong>Trip Type</strong></td>
      <td style="padding:8px;border:1px solid #ddd;">${tripType}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;"><strong>Route</strong></td>
      <td style="padding:8px;border:1px solid #ddd;">${from} → ${to}</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;"><strong>Departure</strong></td>
      <td style="padding:8px;border:1px solid #ddd;">${depStr}</td>
    </tr>
    ${arrStr ? `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;"><strong>Return</strong></td>
      <td style="padding:8px;border:1px solid #ddd;">${arrStr}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:8px;border:1px solid #ddd;"><strong>Passengers</strong></td>
      <td style="padding:8px;border:1px solid #ddd;">
        Adults: ${passengerCount.adults}, Children: ${passengerCount.children}, Infants: ${passengerCount.infants}
      </td>
    </tr>
  </table>
  <p>If you have questions, we’re here to help:</p>
  <p>
    ✉️ <a href="mailto:${site.contactEmail}">${site.contactEmail}</a><br/>
    📞 <a href="tel:${site.contactPhone}">${site.contactPhone}</a><br/>
    💬 <a href="https://wa.me/${site.contactWA.replace(/\D/g, '')}">${site.contactWA}</a>
  </p>
  <p style="margin-top:30px;color:#777;font-size:0.9em;">
    We’ll follow up shortly with your personalized quote.
  </p>
</div>
    `;

    try {
      await transporter.sendMail({
        from: `"Flyva Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'We received your quote request',
        html
      });
    } catch (emailErr) {
      console.warn('⚠️  Customer quote confirmation failed:', emailErr.message);
    }

    return res.status(201).json(quote);

  } catch (err) {
    console.error('Quote submission error:', err);
    return res.status(500).json({ message: 'Server error' });
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
