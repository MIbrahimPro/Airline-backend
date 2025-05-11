// config/db.js
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/TravelNew')
      .then(
        () => console.log('MongoDB connected\n\n\n\n')
      )
      .catch(
        err => console.error(err)
      );
};

module.exports = connectDB;
