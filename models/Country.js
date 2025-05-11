// models/Country.js
const mongoose = require('mongoose');

const CountrySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  region: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Region', 
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Country', CountrySchema);
