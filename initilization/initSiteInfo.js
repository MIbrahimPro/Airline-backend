// scripts/resetSiteInfo.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const SiteInfo = require('../models/SiteInfo');
const connect = require('../config/db');

async function resetSiteInfo() {
    await connect();
    console.log('MongoDB connected');

    // 1) Check if existing data exists
    const existingInfo = await SiteInfo.findOne({});

    let info;
    if (existingInfo) {
        console.log('Existing SiteInfo found. Updating with defaults where necessary.');

        // Hash sample admin password (only if no admin password exists)
        let adminPasswordHash = existingInfo.adminPassword;
        if (!adminPasswordHash) {
            const rawPass = 'admin123';
            adminPasswordHash = await bcrypt.hash(rawPass, 10);
            console.log('Generated new admin password hash.');
        }

        // Merge existing data with default values
        const updatedData = {
            adminEmail: existingInfo.adminEmail || 'admin@admin.com',
            adminPassword: adminPasswordHash,

            contactEmail: existingInfo.contactEmail || 'info@example.com',
            contactPhone: existingInfo.contactPhone || '+92 300 1234567',
            contactWA: existingInfo.contactWA || '+92 300 1234567',

            addressText: existingInfo.addressText || '123 Main Street, Islamabad, Pakistan',
            mapEmbedCode: existingInfo.mapEmbedCode || '<iframe src="https://maps.google.com/sample" width="300" height="200"></iframe>',

            aboutInfo: existingInfo.aboutInfo || 'We specialize in crafting unforgettable journeys.',
            aboutUsLong: existingInfo.aboutUsLong || 'Our mission is to make travel simple, affordable, and fun for everyone.',

            faq: existingInfo.faq && existingInfo.faq.length > 0 ? existingInfo.faq : [
                { question: 'No booking fees?', answer: 'Absolutely none—what you see is what you pay.' },
                { question: 'Can I cancel?', answer: 'Yes, see our Cancellation Policy.' }
            ],

            privacyPolicy: existingInfo.privacyPolicy && existingInfo.privacyPolicy.length > 0 ? existingInfo.privacyPolicy : [
                {
                    heading: '1. Introduction',
                    text: 'Your privacy matters to us.',
                    bullets: [{ text: 'We do not sell your data.' }]
                }
            ],

            booking: existingInfo.booking ? { ...existingInfo.booking } : {
                heading: 'How to Book',
                text: 'Follow these simple steps to secure your reservation:',
                items: [
                    {
                        subheading: 'Step 1: Search Flights',
                        text: 'Use our search tool to find the best routes and prices.'
                    },
                    {
                        subheading: 'Step 2: Payment',
                        text: 'Enter your payment information securely on our site.'
                    },
                    {
                        subheading: 'Step 3: Confirmation',
                        text: 'Receive an email confirmation with your e‑ticket.'
                    }
                ]
            }
        };

        // Update the existing document
        info = await SiteInfo.findOneAndUpdate({}, updatedData, { new: true, upsert: true });
        console.log('Updated existing SiteInfo.');
    } else {
        console.log('No existing SiteInfo found. Creating new with default data.');

        // Hash sample admin password
        const rawPass = 'admin123';
        const hash = await bcrypt.hash(rawPass, 10);

        // Create new SiteInfo with default data
        info = await SiteInfo.create({
            adminEmail: 'admin@admin.com',
            adminPassword: hash,

            contactEmail: 'info@example.com',
            contactPhone: '+92 300 1234567',
            contactWA: '+92 300 1234567',

            addressText: '123 Main Street, Islamabad, Pakistan',
            mapEmbedCode: '<iframe src="https://maps.google.com/sample" width="300" height="200"></iframe>',

            aboutInfo: 'We specialize in crafting unforgettable journeys.',
            aboutUsLong: 'Our mission is to make travel simple, affordable, and fun for everyone.',

            faq: [
                { question: 'No booking fees?', answer: 'Absolutely none—what you see is what you pay.' },
                { question: 'Can I cancel?', answer: 'Yes, see our Cancellation Policy.' }
            ],

            privacyPolicy: [
                {
                    heading: '1. Introduction',
                    text: 'Your privacy matters to us.',
                    bullets: [{ text: 'We do not sell your data.' }]
                }
            ],

            booking: {
                heading: 'Buy Now Pay Later',
                text: 'Follow these simple steps to secure your reservation:',
                items: [
                    {
                        subheading: 'Step 1: Search Flights',
                        text: 'Use our search tool to find the best routes and prices.'
                    },
                    {
                        subheading: 'Step 2: Payment',
                        text: 'Enter your payment information securely on our site.'
                    },
                    {
                        subheading: 'Step 3: Confirmation',
                        text: 'Receive an email confirmation with your e‑ticket.'
                    }
                ]
            }
        });

        console.log('Created new SiteInfo with booking info:');
    }

    console.log(
        { adminEmail: info.adminEmail },
        "admin password is old password if there as no password then the password is set to :",
        { adminPassword: 'admin123' } // We show the raw password for clarity after creation/update
    );

    process.exit(0);
}

resetSiteInfo().catch(err => {
    console.error('Error resetting/updating SiteInfo:', err);
    process.exit(1);
});