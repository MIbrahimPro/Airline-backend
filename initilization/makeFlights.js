// generateFlights.js
require('dotenv').config();
const mongoose = require('mongoose');
const Airline = require('../models/Airline');
const Airport = require('../models/Airport');
const Flight   = require('../models/Flight');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makePrices() {
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  return months.map(month => {
    const oneWay = Number((Math.random() * (500 - 50) + 50).toFixed(2));
    const roundTrip = Number((oneWay * 1.8).toFixed(2));
    // 30% chance to have a discount
    const discOW = Math.random() < 0.3
      ? Number((Math.random() * 0.3 * oneWay).toFixed(2))
      : 0;
    const discRT = Math.random() < 0.3
      ? Number((Math.random() * 0.3 * roundTrip).toFixed(2))
      : 0;

    return {
      month,
      oneWay,
      roundTrip,
      discount: {
        oneWay: discOW,
        roundTrip: discRT
      }
    };
  });
}

function makeDuration() {
  return {
    hours: randInt(1, 12),
    minutes: randChoice([0, 15, 30, 45])
  };
}

async function generateFlights() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✔ Connected to MongoDB');

  // 1) Delete all existing flights
  const del = await Flight.deleteMany({});
  console.log(`🗑 Deleted ${del.deletedCount} existing flights`);

  const airlines = await Airline.find();
  const airports = await Airport.find();

  let count = 0;
  for (const airline of airlines) {
    for (const dep of airports) {
      for (const arr of airports) {
        if (dep._id.equals(arr._id)) continue; // skip same-airport

        const flightDoc = {
          airline:          airline._id,
          departureAirport: dep._id,
          arrivalAirport:   arr._id,
          prices:           makePrices(),
          toDuration:       makeDuration(),
          fromDuration:     makeDuration()
        };

        await Flight.create(flightDoc);
        count++;
        if (count % 1000 === 0) {
          console.log(`✅ ${count} flights created so far...`);
        }
      }
    }
  }

  console.log(`🎉 Done. ${count} total flights created.`);
  process.exit(0);
}

generateFlights().catch(err => {
  console.error('❌ Error generating flights:', err);
  process.exit(1);
});
