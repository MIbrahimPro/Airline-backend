const mongoose = require("mongoose");

// ─── Shared sub‑schemas ──────────────────────────────────────

const BulletItem = new mongoose.Schema(
    {
        text: { type: String, required: true },
        heading: { type: String },
    },
    { _id: false }
);

const Section = new mongoose.Schema(
    {
        heading: { type: String, required: true },
        text: { type: String, required: true },
        bullets: { type: [BulletItem], default: [] },
    },
    { _id: false }
);

const FAQItem = new mongoose.Schema(
    {
        question: { type: String, required: true },
        answer: { type: String, required: true },
    },
    { _id: false }
);

// ─── Booking info ────────────────────────────────────────────

const BookingItem = new mongoose.Schema(
    {
        subheading: { type: String, required: true, trim: true },
        text: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const BookInfo = new mongoose.Schema(
    {
        heading: { type: String, required: true, trim: true },
        text: { type: String, required: true, trim: true },
        items: { type: [BookingItem], default: [] },
    },
    { _id: false }
);

// ─── About‑us long blocks ─────────────────────────────────────

const AboutBlock = new mongoose.Schema(
    {
        subheading: { type: String }, // optional
        text: { type: String, required: true, trim: true },
    },
    { _id: false }
);

// ─── Main SiteInfo ────────────────────────────────────────────

const SiteInfoSchema = new mongoose.Schema(
    {
        adminEmail: { type: String, required: true, trim: true },
        adminPassword: { type: String, required: true, trim: true },

        contactEmail: { type: String, required: true, trim: true },
        contactPhone: { type: String, required: true, trim: true },
        contactWA: { type: String, required: true, trim: true },

        addressText: { type: String, required: true, trim: true },
        mapEmbedCode: { type: String, required: true, trim: true },

        aboutInfo: { type: String, required: true, trim: true },

        // ← now an array of text‑blocks, each with optional subheading
        aboutUsLong: { type: [AboutBlock], default: [] },

        faq: { type: [FAQItem], default: [] },
        privacyPolicy: { type: [Section], default: [] },

        // ← new Terms field, same structure as privacyPolicy
        terms: { type: [Section], default: [] },

        booking: { type: BookInfo, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SiteInfo", SiteInfoSchema);
