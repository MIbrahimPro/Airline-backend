// routes/siteInfo.js
const express = require("express");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { authenticate, authorizeAdmin } = require("../middlewares/auth");
const { forgotLimiter } = require("../middlewares/ratelimmiter");
const transporter = require("../utils/mailer");

const SiteInfo = require("../models/SiteInfo");

const router = express.Router();

//=======================================================================================================

function cleanLink(input) {
  if (typeof input !== "string") return null;

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

  if (url.startsWith("https://www.google.com/maps/embed")) {
    return url;
  }

  return null;
}

//=======================================================================================================

router.get("/public", async (req, res) => {
  const info = await SiteInfo.findOne().lean();

  if (!info) {
    return res.status(404).json({ message: "Not found" });
  }

  const {
    contactEmail,
    contactPhone,
    contactWA,

    addressText,
    mapEmbedCode,

    aboutInfo,
    aboutUsLong,

    faq,
    privacyPolicy,
    booking,
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
    privacyPolicy,
    booking,
  });
});

router.get("/public/about-long", async (req, res) => {
  const { aboutUsLong } = await SiteInfo.findOne().lean();

  if (!aboutUsLong) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({ aboutUsLong });
});
router.get("/public/privacy", async (req, res) => {
  const { privacyPolicy } = await SiteInfo.findOne().lean();

  if (!privacyPolicy) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({ privacyPolicy });
});
router.get("/public/about", async (req, res) => {
  const { aboutInfo } = await SiteInfo.findOne().lean();

  if (!aboutInfo) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({ aboutInfo });
});
router.get("/public/faq", async (req, res) => {
  const { faq } = await SiteInfo.findOne().lean();

  if (!faq) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({ faq });
});
router.get("/public/contact", async (req, res) => {
  const siteInfo = await SiteInfo.findOne().lean();

  if (
    !siteInfo ||
    !siteInfo.contactEmail ||
    !siteInfo.contactPhone ||
    !siteInfo.contactWA
  ) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({
    contactEmail: siteInfo.contactEmail,
    contactPhone: siteInfo.contactPhone,
    contactWA: siteInfo.contactWA,
  });
});
router.get("/public/address", async (req, res) => {
  const siteInfo = await SiteInfo.findOne().lean();

  if (!siteInfo || !siteInfo.addressText || !siteInfo.mapEmbedCode) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({
    addressText: siteInfo.addressText,
    mapEmbedCode: siteInfo.mapEmbedCode,
  });
});
router.get("/public/booking", async (req, res) => {
  const { booking } = await SiteInfo.findOne().lean();

  if (!booking) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({ booking });
});

//=======================================================================================================

router.get("/admin/email", authenticate, authorizeAdmin, async (req, res) => {
  const { adminEmail } = await SiteInfo.findOne().lean();

  if (!adminEmail) {
    return res.status(404).json({ message: "Not found" });
  }

  res.json({ adminEmail });
});

router.get("/admin/all", authenticate, authorizeAdmin, async (req, res) => {
  const info = await SiteInfo.findOne().lean();

  if (!info) {
    return res.status(404).json({ message: "Not found" });
  }

  delete info.adminPassword;
  res.json(info);
});

router.put("/password", authenticate, authorizeAdmin, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const site = await SiteInfo.findOne();

  const ok = await bcrypt.compare(oldPassword, site.adminPassword);
  if (!ok) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  site.adminPassword = await bcrypt.hash(newPassword, 10);
  await site.save();
  res.json({ message: "Password updated" });
});

router.put("/admin/email", authenticate, authorizeAdmin, async (req, res) => {
  const { oldEmail, newEmail } = req.body;
  if (!oldEmail || !newEmail) {
    return res
      .status(400)
      .json({ message: "oldEmail and newEmail are required" });
  }
  const site = await SiteInfo.findOne();
  if (!site) return res.status(404).json({ message: "Not found" });

  if (site.adminEmail !== oldEmail) {
    return res.status(400).json({ message: "Current email does not match" });
  }
  site.adminEmail = newEmail;
  await site.save();
  res.json({ message: "Email updated", adminEmail: newEmail });
});

router.post("/forgot", forgotLimiter, async (req, res) => {
  try {
    // Load the single SiteInfo doc
    const info = await SiteInfo.findOne();
    if (!info) {
      return res.status(404).json({ message: "SiteInfo not found" });
    }

    // Generate new random credentials
    // const localPart = Math.random().toString(36).slice(2, 10);
    const newAdminEmail = process.env.EMAIL_USER; // send to same email
    const rawNewPassword = Math.random().toString(36).slice(2, 10);
    const hashedPassword = await bcrypt.hash(rawNewPassword, 10);

    const now = new Date();

    // Send the email to the same EMAIL_USER
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: newAdminEmail,
      subject: "Your admin password has been reset",
      text: `
Your admin password was reset at ${now.toISOString()}.

                    Email:    ${newAdminEmail}
                    Password: ${rawNewPassword}

Please log in and change it as soon as possible.  (This is testing from backend )
              `.trim(),
    });

    // Update SiteInfo
    info.adminEmail = newAdminEmail;
    info.adminPassword = hashedPassword;
    await info.save();

    console.log("🔐 New admin creds:", {
      adminEmail: newAdminEmail,
      adminPassword: rawNewPassword,
    });

    res.json({ message: "New credentials generated and emailed." });
  } catch (err) {
    console.error("Error in forgot-password route:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", authenticate, authorizeAdmin, async (req, res) => {
  const data = { ...req.body };
  // preserve email/password
  delete data.adminEmail;
  delete data.adminPassword;

  // mapEmbedCode logic
  const existing = await SiteInfo.findOne().lean();
  if (!existing) {
    return res.status(500).json({ message: "SiteInfo not found" });
  }
  if (data.addressText) {
    data.mapEmbedCode =
      (await cleanLink(data.mapEmbedCode || existing.mapEmbedCode)) ||
      existing.mapEmbedCode;
  } else {
    data.mapEmbedCode = existing.mapEmbedCode;
  }
  // preserve existing booking if not provided
  if (!("booking" in data)) {
    data.booking = existing.booking;
  }

  const info = await SiteInfo.findOneAndUpdate({}, data, {
    upsert: true,
    new: true,
    runValidators: true,
  });
  res.status(201).json(info);
});

// PUT /api/siteinfo
router.put("/", authenticate, authorizeAdmin, async (req, res) => {
  const data = { ...req.body };
  delete data.adminEmail;
  delete data.adminPassword;

  const existing = await SiteInfo.findOne().lean();
  if (!existing) {
    return res.status(500).json({ message: "SiteInfo not found" });
  }
  if (data.addressText) {
    data.mapEmbedCode =
      (await cleanLink(data.mapEmbedCode || existing.mapEmbedCode)) ||
      existing.mapEmbedCode;
  } else {
    data.mapEmbedCode = existing.mapEmbedCode;
  }
  if (!("booking" in data)) {
    data.booking = existing.booking;
  }

  const info = await SiteInfo.findOneAndUpdate({}, data, {
    new: true,
    runValidators: true,
  });
  res.json(info);
});

//=======================================================================================================

module.exports = router;

//=======================================================================================================
