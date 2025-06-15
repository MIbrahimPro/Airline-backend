// scripts/updateSiteInfoProd.js
require("dotenv").config();
const mongoose = require("mongoose");
const SiteInfo = require("../models/SiteInfo");

async function run() {
    if (!process.env.MONGO_URI) {
        console.error("❌ MONGODB_URI not set");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const site = await SiteInfo.findOne();
    if (!site) {
        console.error("❌ No SiteInfo document found.");
        process.exit(1);
    }

    // ─── Update aboutUsLong with clear, editable blocks ─────────────
    site.aboutUsLong = [
        {
            text: `Welcome to Travel. We’re committed to crafting unforgettable journeys for every traveler.`,
        },
        {
            subheading: "Our Mission",
            text: `To deliver exceptional service, unbeatable deals, and a seamless booking experience from start to finish.`,
        },
        {
            subheading: "Our Vision",
            text: `To be your trusted travel companion—innovating constantly to bring you the best in flight options and support.`,
        },
        {
            subheading: "Our Team",
            text: `A dedicated group of travel enthusiasts driving quality and convenience in every booking we facilitate.`,
        },
        {
            subheading: "Our Promise",
            text: `Transparent pricing, honest advice, and 24/7 support—because your journey matters most.`,
        },
    ];
    console.log("📝 aboutUsLong set to production placeholders");

    // ─── Populate terms with standard sections ─────────────────────────
    site.terms = [
        {
            heading: "1. Acceptance of Terms",
            text: `By using our services, you agree to these Terms & Conditions in full.`,
            bullets: [
                {
                    text: "You must be at least 18 years old to book.",
                    heading: "Age Requirement:",
                },
            ],
        },
        {
            heading: "2. Booking Rules",
            text: `All bookings are subject to airline and regulatory requirements.`,
            bullets: [
                { text: "Changes may incur fees." },
                { text: "Cancellations follow each airline’s policy." },
            ],
        },
        {
            heading: "3. Payment and Pricing",
            text: `Prices shown are final at the time of booking, unless otherwise indicated.`,
            bullets: [
                { text: "Payment methods accepted: credit card, PayPal." },
            ],
        },
        {
            heading: "4. Liability",
            text: `Travel. acts as an agent only and is not liable for airline delays or cancellations.`,
            bullets: [
                { text: "We cannot control third‑party provider performance." },
            ],
        },
        {
            heading: "5. Privacy Compliance",
            text: `Your personal data is handled per our Privacy Policy.`,
            bullets: [{ text: "We do not share your data without consent." }],
        },
        {
            heading: "6. Changes to Terms",
            text: `We may update these Terms & Conditions at any time. You’re bound by the latest version.`,
            bullets: [],
        },
    ];
    console.log("📝 terms sections populated with placeholders");

    // ─── Commit the changes ───────────────────────────────────────────
    await site.save();
    console.log("✅ SiteInfo updated for production rollout");
    process.exit(0);
}

run().catch((err) => {
    console.error("🚨 Migration failed:", err);
    process.exit(1);
});
