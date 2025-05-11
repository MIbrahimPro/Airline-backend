require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csvParser = require('csv-parser');

const connectDB = require('../config/db');
// Models
const Region = require('../models/Region');
const Country = require('../models/Country');
const Location = require('../models/Location');
const Airline = require('../models/Airline');
const Airport = require('../models/Airport');
const Flight = require('../models/Flight');
const SiteInfo = require('../models/SiteInfo');
const Contact = require('../models/Contact');
const Quote = require('../models/Quote');
const Booking = require('../models/Booking');

(async () => {
  await connectDB();
  console.log('\n✓ Connected to MongoDB');

  const csvDir = path.join(__dirname, 'csv');
  const readCSV = name => new Promise((res, rej) => {
    const rows = [];
    fs.createReadStream(path.join(csvDir, `${name}.csv`))
      .pipe(csvParser())
      .on('data', data => rows.push(data))
      .on('end', () => res(rows))
      .on('error', err => rej(err));
  });

  // Import sequence
  console.log('• Importing regions...');
  const regions = await Region.insertMany((await readCSV('regions')).map(r => ({ name: r.name })));

  console.log('• Importing countries...');
  const countries = await Country.insertMany((await readCSV('countries')).map(c => ({ name: c.name, region: regions.find(r => r.name === c.region)._id })));

  console.log('• Importing locations...');
  const locations = await Location.insertMany((await readCSV('locations')).map(l => ({ name: l.name, country: countries.find(c => c.name === l.country)._id, isPopular: l.isPopular === 'true', dealings: l.dealings, description: l.description, image: l.image })));

  console.log('• Importing airlines...');
  const airlines = await Airline.insertMany((await readCSV('airlines')).map(a => ({ shortName: a.shortName, logoPicture: a.logoPicture, monogramPicture: a.monogramPicture, overview: a.overview, baggage: a.baggage === 'true' })));

  console.log('• Importing airports...');
  const airports = await Airport.insertMany((await readCSV('airports')).map(a => ({ name: a.name, location: locations.find(l => l.name === a.location)._id, code: a.code })));

  console.log('• Importing flights...');
  const flights = await readCSV('flights');
  await Flight.insertMany(flights.map(f => ({ departureAirport: airports.find(a => a._id.toString() === f.departureAirport)?._id, arrivalAirport: airports.find(a => a._id.toString() === f.arrivalAirport)?._id, airline: airlines.find(a => a._id.toString() === f.airline)?._id, prices: JSON.parse(f.prices) })));

  console.log('• Importing siteinfo...');
  await SiteInfo.create((await readCSV('siteinfo_original'))[0]);

  console.log('• Importing contacts...');
  await Contact.insertMany(await readCSV('contacts'));

  console.log('• Importing quotes...');
  await Quote.insertMany(await readCSV('quotes'));

  console.log('• Importing bookings...');
  await Booking.insertMany(await readCSV('bookings'));

  console.log('\n✓ Import complete');
  process.exit();
})();
