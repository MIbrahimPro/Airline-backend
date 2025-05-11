const mongoose = require('mongoose');

const PassengerCountSchema = new mongoose.Schema({
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, default: 0, min: 0 },
    infants: { type: Number, default: 0, min: 0 }
}, { _id: false });

const QuoteSchema = new mongoose.Schema({
    customerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    contactPhone: { type: String, trim: true },

    tripType: { type: String, enum: ['one-way', 'round-trip'], required: true },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    preferredAirline: { type: mongoose.Schema.Types.ObjectId, ref: 'Airline' },

    departureDate: { type: Date, required: true },
    arrivalDate: {
        type: Date,
        required: function () {
            return this.tripType === 'round-trip';
        },
        validate: {
            validator: function (v) {
                // `this` refers to the document being validated
                if (this.tripType === 'round-trip' && v) {
                    return v > this.departureDate;
                }
                // If it's not round-trip, or arrivalDate is not provided, the validation passes
                return true;
            },
            message: 'arrivalDate must be after departureDate for round-trip trips'
        }
    },

    extraDetails: { type: String, trim: true },

    passengerCount: { type: PassengerCountSchema, required: true },

    status: {
        type: String,
        enum: ['pending', 'in-progress', 'responded', 'closed'],
        default: 'pending'
    },

    price: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '', trim: true }

}, { timestamps: true });

module.exports = mongoose.model('Quote', QuoteSchema);
