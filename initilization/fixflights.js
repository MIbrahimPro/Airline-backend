const mongoose = require('mongoose');

// Assuming Flight model is defined in a separate file
const Flight = require('../models/Flight'); // Adjust path to your Flight model

// Utility function for random integer
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Traveldb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
    updateFlights();
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

async function updateFlights() {
    try {
        const batchSize = 100; // Process 100 flights at a time
        let skip = 0;
        let totalUpdated = 0;

        while (true) {
            // Fetch a batch of flights
            const flights = await Flight.find({})
                .skip(skip)
                .limit(batchSize)
                .lean(); // Use lean for performance (returns plain JS objects)

            if (flights.length === 0) {
                console.log('No more flights to process.');
                break;
            }

            // Process each flight in the batch
            for (const flight of flights) {
                // Skip if stops is already set (for idempotency)
                if (flight.stops !== undefined) {
                    console.log(`Flight ${flight._id} already has stops: ${flight.stops}, skipping.`);
                    continue;
                }

                // Assign stops based on probability
                const rand = randInt(1, 100);
                let stops;
                if (rand <= 70) {
                    stops = 0; // 70% chance for direct
                } else if (rand <= 95) {
                    stops = 1; // 25% chance for one stop
                } else {
                    stops = 2; // 5% chance for two stops
                }

                // Update the flight with stops
                await Flight.updateOne(
                    { _id: flight._id },
                    { $set: { stops } }
                );
                console.log(`Updated flight ${flight._id} with stops: ${stops}`);
                totalUpdated++;
            }

            skip += batchSize;
        }

        console.log(`Update complete. Total flights updated: ${totalUpdated}`);
        mongoose.connection.close();
    } catch (err) {
        console.error('Error updating flights:', err);
        mongoose.connection.close();
        process.exit(1);
    }
}