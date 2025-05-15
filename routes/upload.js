


const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const router = express.Router();

// Base upload directory
const baseDir = path.join(__dirname, '../uploads');
const locDir = path.join(baseDir, 'locations');
const airDir = path.join(baseDir, 'airlines');

// Ensure upload directories exist
[baseDir, locDir, airDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Storage config for locations
const storageLocations = multer.diskStorage({
    destination: (req, file, cb) => cb(null, locDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `loc-${Date.now()}${ext}`); // Store with original extension
    }
});
const uploadLocations = multer({ storage: storageLocations });

// Storage config for airlines
const storageAirlines = multer.diskStorage({
    destination: (req, file, cb) => cb(null, airDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `air-${Date.now()}${ext}`); // Store with original extension
    }
});
const uploadAirlines = multer({ storage: storageAirlines });

// Function to process and convert image to WebP
async function processImage(originalImagePath, destinationDir, filenamePrefix) {
    const webpFilename = `${filenamePrefix}-${Date.now()}.webp`;
    const webpPath = path.join(destinationDir, webpFilename);

    try {
        await sharp(originalImagePath)
            .webp({ quality: 80 }) // Adjust quality as needed
            .toFile(webpPath);

        // Optionally delete the original file
        fs.unlink(originalImagePath, (err) => {
            if (err) {
                console.error('Error deleting original image:', err);
            }
        });

        return { webpFilename, webpPath };
    } catch (error) {
        console.error('Error processing image with sharp:', error);
        throw error; // Re-throw to be caught by route handler
    }
}

// POST /api/upload/locations -> locations images
router.post('/locations', uploadLocations.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const { webpFilename } = await processImage(req.file.path, locDir, 'loc');
        res.json({ imageUrl: `/uploads/locations/${webpFilename}` });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to process image' });
    }
});

// POST /api/upload/airlines -> airlines images
router.post('/airlines', uploadAirlines.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const { webpFilename } = await processImage(req.file.path, airDir, 'air');
        res.json({ imageUrl: `/uploads/airlines/${webpFilename}` });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to process image' });
    }
});

// POST /api/upload/  -> general upload.  Added this route.
router.post('/', uploadLocations.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const { webpFilename } = await processImage(req.file.path, locDir, 'loc'); // Or airDir, or a new dir
        res.json({ imageUrl: `/uploads/locations/${webpFilename}` }); //  adjust path
    } catch (error) {
        return res.status(500).json({ error: 'Failed to process image' });
    }
});

module.exports = router;
