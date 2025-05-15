// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// import routes
const regionRoutes = require('./routes/region');
const countryRoutes = require('./routes/country');
const locationRoutes = require('./routes/location');
const airportRoutes = require('./routes/airport');
const airlineRoutes = require('./routes/airline');
const flightRoutes = require('./routes/flight');
const bookingRoutes = require('./routes/booking');
const siteInfoRoutes = require('./routes/siteInfo');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contact');
const quoteRoutes = require('./routes/quote');
const uploadRoute = require('./routes/upload');

const app = express();

// Connect to MongoDB
connectDB();

// Body parser
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health-check endpoint
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Mount all API routes under /api
app.use('/api/region', regionRoutes);
app.use('/api/country', countryRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/airport', airportRoutes);
app.use('/api/airline', airlineRoutes);
app.use('/api/flight', flightRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/siteinfo', siteInfoRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoute);

// Path to your React build (adjust if you placed it elsewhere)
const buildPath = path.join(__dirname, 'build');

// Only attempt to serve static/react if build directory exists
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));

    // All non-API, non-uploads routes go to React
    app.get(/^\/(?!api)(?!uploads).*/, (_req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
} else {
    console.warn('⚠️ React build directory not found, skipping static file serving');
}

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
