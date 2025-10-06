const mongoose = require('mongoose');
const Booking = require('./models/Booking');
require('dotenv').config();

async function updatePendingBookings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    console.log('\n🔄 Updating pending bookings to confirmed status...');
    
    // Find all pending bookings
    const pendingBookings = await Booking.find({ status: 'pending' });
    console.log(`Found ${pendingBookings.length} pending bookings`);

    if (pendingBookings.length > 0) {
      // Update all pending bookings to confirmed
      const result = await Booking.updateMany(
        { status: 'pending' },
        { status: 'confirmed' }
      );

      console.log(`✅ Updated ${result.modifiedCount} bookings from pending to confirmed`);
      
      // Show updated bookings
      const updatedBookings = await Booking.find({ status: 'confirmed' }).limit(5);
      console.log('\n📋 Sample of updated bookings:');
      updatedBookings.forEach((booking, index) => {
        console.log(`${index + 1}. Booking ID: ${booking.bookingId} - Status: ${booking.status}`);
      });
    } else {
      console.log('ℹ️  No pending bookings found to update');
    }

    console.log('\n✅ Booking status update completed!');
    console.log('📝 New bookings will now be created with "confirmed" status by default');
    console.log('📝 Status will show as "Approved" in the frontend');

  } catch (error) {
    console.error('❌ Error updating bookings:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updatePendingBookings();
