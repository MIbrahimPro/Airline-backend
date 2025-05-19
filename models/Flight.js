const mongoose = require('mongoose');

const PriceEntry = new mongoose.Schema({
    month: {
        type: String,
        required: true,
        enum: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
    },
    oneWay: { type: Number, required: true, min: 0 },
    roundTrip: { type: Number, required: true, min: 0 },
    discount: {
        oneWay: {
            type: Number,
            min: 0,
            validate: {
                validator: function (v) { return v < this.oneWay; },
                message: 'One-way discount must be less than the one-way price'
            }
        },
        roundTrip: {
            type: Number,
            min: 0,
            validate: {
                validator: function (v) { return v < this.roundTrip; },
                message: 'Round-trip discount must be less than the round-trip price'
            }
        }
    }
}, { _id: false });

const DurationSchema = new mongoose.Schema({
    hours: { type: Number, required: true, min: 0, default: 0 },
    minutes: { type: Number, required: true, min: 0, max: 59, default: 0 }
}, { _id: false });




const FlightSchema = new mongoose.Schema({
    departureAirport: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Airport',
        required: true
    },
    arrivalAirport: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Airport',
        required: true
    },
    airline: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Airline',
        required: true
    },
    prices: {
        type: [PriceEntry],
        validate: {
            validator: function (arr) {
                return arr.length === 12;
            },
            message: 'Prices array must contain 12 entries, one for each month.'
        }
    },
    toDuration: { type: DurationSchema, required: true },
    fromDuration: { type: DurationSchema, required: true },
    stops: { type: Number, required: true, min: 0 },
}, {
    timestamps: true
});

module.exports = mongoose.model('Flight', FlightSchema);
