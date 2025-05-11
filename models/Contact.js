const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({

    name:       { type: String, required: true, trim: true                                                                                  },
    email:      { type: String, required: true, trim: true                                                                                  },
    phone:      { type: String,                 trim: true                                                                                  },
    message:    { type: String, required: true, trim: true                                                                                  },
    status:     { type: String,                             default: 'pending', enum: ['pending', 'in-progress', 'responded', 'closed']     },
    extraNotes: { type: String,                 trim: true, default: '',                                                                    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Contact', ContactSchema);
