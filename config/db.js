// config/db.js
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Traveldb')
      .then(
        () => console.log('MongoDB connected')
      )
      .catch(
        err => console.error(err)
      );
};

module.exports = connectDB;
