// scripts/resetSiteInfo.js
require('dotenv').config();
const mongoose   = require('mongoose');
const bcrypt     = require('bcrypt');
const SiteInfo   = require('../models/SiteInfo');
const connectDB  = require('../config/db');

async function resetSiteInfo() {
  await connectDB();
  console.log('✔ MongoDB connected');

  // 1) wipe
  const del = await SiteInfo.deleteMany({});
  console.log(`🗑 Deleted ${del.deletedCount} existing siteInfo docs`);

  // 2) hash password
  const rawPassword = 'admin123';
  const saltRounds  = 10;
  const hash        = await bcrypt.hash(rawPassword, saltRounds);

  // 3) create new
  const info = await SiteInfo.create({
    adminEmail:    'admin@admin.com',
    adminPassword: hash,
    contactEmail:  'info@example.com',
    contactPhone:  '+1-555-555-5555',
    addressText:   '123 Main St, Anytown, USA',
    aboutInfo:     'This is sample about info.',
    faq: [
      { question: 'Sample Q1?', answer: 'Sample A1.' },
      { question: 'Sample Q2?', answer: 'Sample A2.' }
    ],
    privacyPolicy: [
      { heading: '1. Intro', text: 'Sample privacy intro', bullets: [] }
    ]
  });

  console.log('✅ New siteInfo created:', {
    adminEmail: info.adminEmail,
    adminPasswordHash: info.adminPassword
  });
  process.exit(0);
}

resetSiteInfo().catch(err => {
  console.error('❌ Error resetting SiteInfo:', err);
  process.exit(1);
});
