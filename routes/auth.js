// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SiteInfo = require('../models/SiteInfo');



router.post('/login', async (req, res) => {

    const { email, password } = req.body;

    const site = await SiteInfo.findOne();

    if (!site) {
        return res.status(500).json({ message: 'Server not configured' });
    }



    const ok = await bcrypt.compare(password, site.adminPassword);
    if (!ok || email !== site.adminEmail) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }



    const payload = { id: site._id, isAdmin: true };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });


});



router.get('/verify', (req, res) => {

    const header = req.headers.authorization || '';

    const token = header.replace('Bearer ', '');
    console.log("token " + token);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        console.log("payload" + payload);

        return res.json({ valid: true });
    } catch {
        return res.json({ valid: false });
    }
});





module.exports = router;
