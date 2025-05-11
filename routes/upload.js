// module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Base upload directory
const baseDir = path.join(__dirname, '../uploads');
const locDir = path.join(baseDir, 'locations');
const airDir = path.join(baseDir, 'airlines');

// Ensure upload directories exist
[baseDir, locDir, airDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Storage config for locations (used by POST /api/upload/locations)
const storageLocations = multer.diskStorage({
  destination: (req, file, cb) => cb(null, locDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `loc-${Date.now()}${ext}`);
  }
});
const uploadLocations = multer({ storage: storageLocations });

// Storage config for airlines (used by POST /api/upload/airlines)
const storageAirlines = multer.diskStorage({
  destination: (req, file, cb) => cb(null, airDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `air-${Date.now()}${ext}`);
  }
});
const uploadAirlines = multer({ storage: storageAirlines });

// POST /api/upload/locations -> locations images
router.post('/locations', uploadLocations.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ imageUrl: `/uploads/locations/${req.file.filename}` });
});

// POST /api/upload/airlines -> airlines images
router.post('/airlines', uploadAirlines.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ imageUrl: `/uploads/airlines/${req.file.filename}` });
});

module.exports = router;
