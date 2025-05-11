// models/Booking.js
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  flight: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  contactPreference: {
    type: String,
    enum: ['call', 'whatsapp', 'email'],
    required: true
  },
  peopleCount: {
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, default: 0, min: 0 },
    infants: { type: Number, default: 0, min: 0 }
  },
  extraDetails: { type: String },

  departureDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        return v > this.departureDate;
      },
      message: 'returnDate must come after departureDate'
    }
  },

  initialBookingPrice: {
    type: Number,
    required: true,
    min: 0
  },

  state: {
    type: String,
    enum: ['pending', 'cancelled', 'confirmed', 'in-progress'],
    default: 'pending'
  },
  finalPrice: {
    type: Number,
    required: true,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }


}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', BookingSchema);
