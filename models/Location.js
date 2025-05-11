// models/Location.js
const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Country',
        required: true
    },
    image: {
        type: String,  // e.g. '/uploads/images/foo.jpg' 
        required: function () {
            // if this is a new document (`this.isNew`) or no image exists yet
            return this.isNew || !this.image;
        }
    },

    // show on “popular destinations” section?
    isPopular: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
        // if marked popular, description is required
        required: function () { return this.isPopular; }
    },

    // “dealings” controls “deals” page placement
    dealings: {
        type: String,
        enum: ['none', 'last-minutes', 'top-destinations', 'hot-deals'],
        default: 'none'
    },

    dealingsDescription: {
        type: String,
        // if dealings ≠ 'none', you must provide a description
        required: function () { return this.dealings !== 'none'; }
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Location', LocationSchema);
