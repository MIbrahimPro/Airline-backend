// routes/siteInfo.js
const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const { authenticate, authorizeAdmin } = require('../middlewares/auth');

const SiteInfo = require('../models/SiteInfo');

const router = express.Router();



//=======================================================================================================


function cleanLink(input) {
    if (typeof input !== 'string') return null;

    let url = input;

    const marker = 'src="';
    const i = input.indexOf(marker);
    if (i !== -1) {
        const start = i + marker.length;
        const end = input.indexOf('"', start);
        if (end !== -1) {
            url = input.slice(start, end);
        }
    }

    if (url.startsWith('https://www.google.com/maps/embed')) {
        return url;
    }

    return null;
}


//=======================================================================================================


router.get('/public', async (req, res) => {

    const info = await SiteInfo.findOne().lean();

    if (!info) {
        return res.status(404).json({ message: 'Not found' });
    };

    const {

        contactEmail,
        contactPhone,
        contactWA,

        addressText,
        mapEmbedCode,

        aboutInfo,
        aboutUsLong,

        faq,
        privacyPolicy

    } = info;


    res.json({

        contactEmail,
        contactPhone,
        contactWA,

        addressText,
        mapEmbedCode,

        aboutInfo,
        aboutUsLong,

        faq,
        privacyPolicy

    });
});

router.get('/public/about-long', async (req, res) => {

    const { aboutUsLong } = await SiteInfo.findOne().lean();

    if (!aboutUsLong) {
        return res.status(404).json({ message: 'Not found' });
    };

    res.json({ aboutUsLong });

});
router.get('/public/privacy', async (req, res) => {
    const { privacyPolicy } = await SiteInfo.findOne().lean();

    if (!privacyPolicy) {
        return res.status(404).json({ message: 'Not found' });
    };

    res.json({ privacyPolicy });
});
router.get('/public/about', async (req, res) => {
    const { aboutInfo } = await SiteInfo.findOne().lean();

    if (!aboutInfo) {
        return res.status(404).json({ message: 'Not found' });
    };

    res.json({ aboutInfo });
});
router.get('/public/faq', async (req, res) => {

    const { faq } = await SiteInfo.findOne().lean();

    if (!faq) {
        return res.status(404).json({ message: 'Not found' });
    };

    res.json({ faq });

});
router.get('/public/contact', async (req, res) => {

    const siteInfo = await SiteInfo.findOne().lean();

    if (!siteInfo || !siteInfo.contactEmail || !siteInfo.contactPhone || !siteInfo.contactWA) {
        return res.status(404).json({ message: 'Not found' });
    };

    res.json({
        contactEmail: siteInfo.contactEmail,
        contactPhone: siteInfo.contactPhone,
        contactWA: siteInfo.contactWA
    });

});
router.get('/public/address', async (req, res) => {

    const siteInfo = await SiteInfo.findOne().lean();

    if (!siteInfo || !siteInfo.addressText || !siteInfo.mapEmbedCode) {
        return res.status(404).json({ message: 'Not found' });
    };

    res.json({
        addressText: siteInfo.addressText,
        mapEmbedCode: siteInfo.mapEmbedCode
    });

});


//=======================================================================================================


router.get('/admin/email', authenticate, authorizeAdmin, async (req, res) => {

    const { adminEmail } = await SiteInfo.findOne().lean();

    if (!adminEmail) {
        return res.status(404).json({ message: 'Not found' });
    };

    res.json({ adminEmail });

});

router.get('/admin/all', authenticate, authorizeAdmin, async (req, res) => {

    const info = await SiteInfo.findOne().lean();

    if (!info) {
        return res.status(404).json({ message: 'Not found' });
    };

    delete info.adminPassword;
    res.json(info);

});

router.put('/password', authenticate, authorizeAdmin, async (req, res) => {

    const { oldPassword, newPassword } = req.body;

    const site = await SiteInfo.findOne();

    const ok = await bcrypt.compare(oldPassword, site.adminPassword);
    if (!ok) {
        return res.status(400).json({ message: 'Current password is incorrect' });
    }

    site.adminPassword = await bcrypt.hash(newPassword, 10);
    await site.save();
    res.json({ message: 'Password updated' });
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {

    let data = { ...req.body };

    if (data.mapEmbedCode) {
        data.mapEmbedCode = await cleanLink(data.mapEmbedCode);
    }

    const info = await SiteInfo.findOneAndUpdate(
        {}, data,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(info);

});


router.put('/', authenticate, authorizeAdmin, async (req, res) => {
    const data = { ...req.body };
    console.log('Incoming data:', data);

    const existing = await SiteInfo.findOne().lean();
    if (!existing) {
        return res.status(500).json({ message: 'SiteInfo not found' });
    }

    if (data.addressText) {
        const cleaned = await cleanLink(data.mapEmbedCode || existing.mapEmbedCode);
        data.mapEmbedCode = cleaned || existing.mapEmbedCode;
    } else {
        data.mapEmbedCode = existing.mapEmbedCode;
    }

    const info = await SiteInfo.findOneAndUpdate(
        {},
        data,
        { new: true, runValidators: true }
    );

    console.log('Updated SiteInfo:', info);
    res.json(info);
});


//=======================================================================================================


module.exports = router;


//=======================================================================================================