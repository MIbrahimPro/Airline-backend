const express = require('express');
const router = express.Router();
const emailjs = require('emailjs-com');


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

        console.log("post route");


        const { name, email, phone, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'name, email, and message are required' });
        }
        const contact = await Contact.create({ name, email, phone, message });




        console.log("post route" + contact);

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
