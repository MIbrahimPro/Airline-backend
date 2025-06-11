const express = require('express');
const router = express.Router();
const emailjs = require('emailjs-com');
const transporter = require('../utils/mailer');  


const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const SiteInfo = require('../models/SiteInfo');


const { authenticate, authorizeAdmin } = require('../middlewares/auth');



require('dotenv').config();


router.get('/', authenticate, authorizeAdmin, async (req, res) => {
    try {
        console.log("get route");
        const all = await Contact.find().sort('-createdAt');
        res.json(all);
    } catch (err) {
        console.error('Error fetching contacts:', err);
        res.status(500).json({ message: 'Server error' });
    }
}
);

// POST /api/contact
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'name, email, and message are required' });
        }

        const contact = await Contact.create({ name, email, phone, message });

        const site = await SiteInfo.findOne();
        const adminEmail = process.env.EMAIL_USER;

        if (adminEmail) {
            try {
                await transporter.sendMail({
                    from: `"Website Contact" <${process.env.EMAIL_USER}>`,
                    to: adminEmail,
                    subject: 'New contact form submission',
                    text: `
You have a new contact form submission:

Name:    ${name}
Email:   ${email}
Phone:   ${phone || '—'}
Message:
${message}
                    `.trim()
                });
            } catch (emailErr) {
                console.warn('⚠️  Failed to notify admin (contact form):', emailErr.message);
            }
        }

        const html = `
      <div style="font-family:sans-serif;line-height:1.5;color:#333">
        <h2 style="color:#0066cc">Hi ${name},</h2>
        <p>Thank you for reaching out! We’ve received your message and will get back to you as soon as possible.</p>
        <hr style="border:none;border-top:1px solid #eee"/>
        <h4 style="margin-bottom:4px;">Your Message:</h4>
        <p style="background:#f9f9f9;padding:10px;border-radius:4px;">${message}</p>
        <p style="font-size:0.9em;color:#666">
          Email: <a href="mailto:${site.contactEmail}">${site.contactEmail}</a><br/>
          Phone: <a href="tel:${site.contactPhone}">${site.contactPhone}</a><br/>
          WhatsApp: <a href="https://wa.me/${site.contactWA.replace(/\D/g, '')}">${site.contactWA}</a>
        </p>
        <p>Cheers,<br/>The Flyva Team</p>
      </div>
    `;

        try {
            await transporter.sendMail({
                from: `"Flyva Support" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'We received your message',
                html
            });
        } catch (emailErr) {
            console.warn('⚠️  Failed to send confirmation to user (contact form):', emailErr.message);
        }

        console.log(`Contact saved and emails attempted: ${contact._id}`);
        res.status(201).json(contact);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/contact/:id
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        console.log("put route");
        const { status, extraNotes } = req.body;
        const update = {};
        if (status) {
            if (!['pending', 'in-progress', 'responded', 'closed'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
            update.status = status;
        }
        if (extraNotes != null && extraNotes != undefined) {
            update.extraNotes = extraNotes;
        }
        const c = await Contact.findByIdAndUpdate(req.params.id, update, { new: true });
        console.log("put route" + c);
        if (!c) return res.status(404).json({ message: 'Not found' });
        res.json(c);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});



// DELETE /api/contact/:id
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
    try {
        console.log('delete route');
        const c = await Contact.findByIdAndDelete(req.params.id);
        if (!c) {
            return res.status(404).json({ message: 'Not found' });
        }
        console.log('deleted contact:', c._id);
        res.json({ message: 'Deleted', id: c._id });
    } catch (err) {
        console.error('Error deleting contact:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});



module.exports = router;
