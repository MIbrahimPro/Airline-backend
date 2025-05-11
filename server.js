

const express = require('express');
const path    = require('path');
const connectDB = require('./config/db');


const regionRoutes   = require('./routes/region');
const countryRoutes  = require('./routes/country');
const locationRoutes = require('./routes/location');
const airportRoutes  = require('./routes/airport');
const airlineRoutes  = require('./routes/airline');
const flightRoutes   = require('./routes/flight');
const bookingRoutes  = require('./routes/booking');
const siteInfoRoutes = require('./routes/siteInfo');
const authRoutes = require('./routes/auth');
const ContactRoutes = require('./routes/contact');
const QuoteRoutes = require('./routes/quote');
const uploadRoute = require('./routes/upload');


// const rateLimiter = require('./middlewares/rateLimiter');
// const auth = require('./middlewares/auth');


//=========================================================================
//=========================================================================


const app = express();
connectDB();
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.set('trust proxy', true);


//=========================================================================

app.use('/api/region',   regionRoutes);
app.use('/api/country',  countryRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/airport',  airportRoutes);
app.use('/api/airline',  airlineRoutes);
app.use('/api/flight',   flightRoutes);
app.use('/api/booking',  bookingRoutes);
app.use('/api/siteinfo', siteInfoRoutes);
app.use('/api/contact', ContactRoutes);
app.use('/api/quote', QuoteRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoute);


//=========================================================================

app.get('/', (req, res) => {
    res.send('API is running...');
});
// app.get('*', (req, res) => {
//     res.send('404 not found...');
// });

//=========================================================================

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`\n\n\n\n\nListening on http://localhost:${PORT}`));

