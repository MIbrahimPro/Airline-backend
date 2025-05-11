const mongoose = require('mongoose');


//===============================================data types===============================================



const BulletItem = new mongoose.Schema({
  
    text:    { type: String, required: true },
    heading: { type: String                 }

}, { _id: false });

const Section = new mongoose.Schema({

    heading: { type: String,        required: true                  },
    text:    { type: String,        required: true                  },
    bullets: { type: [BulletItem],                      default: [] }

}, { _id: false });

const FAQItem = new mongoose.Schema({

  question: { type: String, required: true },
  answer:   { type: String, required: true }

}, { _id: false });



//==============================================main modules==============================================



const SiteInfoSchema = new mongoose.Schema({
  
    adminEmail:     { type: String,    required: true, trim: true                  },
    adminPassword:  { type: String,    required: true, trim: true                  },

    contactEmail:   { type: String,    required: true, trim: true                  },
    contactPhone:   { type: String,    required: true, trim: true                  },
    contactWA:      { type: String,    required: true, trim: true                  },
    
    addressText:    { type: String,    required: true, trim: true                  },
    mapEmbedCode:   { type: String,    required: true, trim: true                  },
    
    aboutInfo:      { type: String,    required: true, trim: true                  },
    aboutUsLong:    { type: String,                                    default: '' },
    
    faq:            { type: [FAQItem],                                 default: [] },
    privacyPolicy:  { type: [Section],                                 default: [] }

}, { timestamps: true });



//========================================================================================================
module.exports = mongoose.model('SiteInfo', SiteInfoSchema);
