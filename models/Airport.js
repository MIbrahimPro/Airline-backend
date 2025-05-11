// models/Airport.js
const mongoose = require('mongoose');

const AirportSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  location: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Location', 
    required: true 
  },
  code: { 
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 3
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Airport', AirportSchema);
