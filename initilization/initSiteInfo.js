// scripts/resetSiteInfo.js
require('dotenv').config();
const mongoose  = require('mongoose');
const bcrypt    = require('bcrypt');
const SiteInfo  = require('../models/SiteInfo'); // make sure this uses the updated schema
const connectDB = require('../config/db');

async function resetSiteInfo() {
  await connectDB();
  console.log('✔ MongoDB connected');

  // 1) Delete existing siteInfo docs
  const del = await SiteInfo.deleteMany({});
  console.log(`🗑 Deleted ${del.deletedCount} existing siteInfo docs`);

  // 2) Hash the password
  const rawPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // 3) Create a new sample SiteInfo
  const info = await SiteInfo.create({
    adminEmail:    'admin@admin.com',
    adminPassword: hashedPassword,

    contactEmail:  'info@example.com',
    contactPhone:  '+92 300 1234567',
    contactWA:     '+92 300 1234567',

    addressText:   '123 Main Street, Islamabad, Pakistan',
    mapEmbedCode:  'https://maps.google.com/sample',

    aboutInfo:     'Welcome to our platform. We offer great travel deals and booking services.',
    aboutUsLong:   'We are a passionate team focused on helping you find the best flights, hotels, and more.',

    faq: [
      { question: 'How to book a flight?', answer: 'Use our search bar and select your trip options.' },
      { question: 'How do I contact support?', answer: 'You can email us at info@example.com.' }
    ],

    privacyPolicy: [
      {
        heading: '1. Introduction',
        text: 'We respect your privacy and are committed to protecting it.',
        bullets: [
          { heading: 'Data Collection', text: 'We only collect necessary user data.' },
          { heading: 'Cookies', text: 'We use cookies to enhance your experience.' }
        ]
      },
      {
        heading: '2. Usage',
        text: 'Your data is used to provide better services.',
        bullets: [
          { text: 'For improving recommendations.' },
          { text: 'To contact you with relevant offers.' }
        ]
      }
    ]
  });

  console.log('✅ New SiteInfo created with:');
  console.log({
    adminEmail: info.adminEmail,
    passwordUsed: rawPassword
  });

  process.exit(0);
}

resetSiteInfo().catch(err => {
  console.error('❌ Error during SiteInfo reset:', err);
  process.exit(1);
});
