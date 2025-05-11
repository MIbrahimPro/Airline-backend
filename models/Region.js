// models/Region.js
const mongoose = require('mongoose');

const RegionSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Region', RegionSchema);
