// models/Airline.js
const mongoose = require('mongoose');

const DetailItem = new mongoose.Schema({
  heading:     { type: String, required: true },
  description: { type: String, required: true }
}, { _id: false });

const AirlineSchema = new mongoose.Schema({
  shortName:        { type: String, required: true, unique: true, trim: true },
  logoPicture:      { type: String, required: true }, // e.g. '/uploads/airlines/Aegean_logo.png'
  monogramPicture:  { type: String, required: true }, // e.g. '/uploads/airlines/Aegean_mono.png'
  details:          { type: [DetailItem], validate: arr => arr.length > 0 },
  overview:         { type: String, required: true },
  baggage:          { type: Boolean, default: false },
  baggageArray:     {
    type: [DetailItem],
    required: function() { return this.baggage; },
    validate: {
      validator: arr => !this.baggage || arr.length > 0,
      message: '`baggageArray` must have at least one item when baggage=true'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Airline', AirlineSchema);
