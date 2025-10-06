const mongoose = require('mongoose');
const Booking = require('./models/Booking');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/consultant_platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testViewSchedule() {
  try {
    console.log('🔍 Checking current bookings...\n');

    // Get all bookings
    const allBookings = await Booking.find()
      .populate('consultant', 'fullName email')
      .populate('seeker', 'fullName email');

    console.log(`📊 Total bookings found: ${allBookings.length}\n`);

    if (allBookings.length === 0) {
      console.log('❌ No bookings found. Creating test data...\n');
      
      // Get first consultant and seeker
      const consultant = await Consultant.findOne();
      const seeker = await Seeker.findOne();

      if (!consultant || !seeker) {
        console.log('❌ No consultant or seeker found. Please create users first.');
        return;
      }

      // Create a test booking for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const testBooking = new Booking({
        consultant: consultant._id,
        seeker: seeker._id,
        sessionDate: tomorrow,
        startTime: '10:00',
        endTime: '11:00',
        sessionDuration: 60,
        sessionType: 'consultation',
        amount: 1500,
        status: 'pending',
        description: 'Test consultation for approval testing'
      });

      await testBooking.save();
      console.log('✅ Test booking created successfully!');
      console.log(`   - Consultant: ${consultant.fullName}`);
      console.log(`   - Seeker: ${seeker.fullName}`);
      console.log(`   - Date: ${tomorrow.toDateString()}`);
      console.log(`   - Time: 10:00 - 11:00`);
      console.log(`   - Status: pending`);
      console.log(`   - Amount: ₹1500\n`);
    } else {
      console.log('📋 Current bookings:');
      allBookings.forEach((booking, index) => {
        console.log(`${index + 1}. ${booking.seeker.fullName} → ${booking.consultant.fullName}`);
        console.log(`   Date: ${new Date(booking.sessionDate).toDateString()}`);
        console.log(`   Time: ${booking.startTime} - ${booking.endTime}`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Amount: ₹${booking.amount}\n`);
      });

      // Check for pending bookings
      const pendingBookings = allBookings.filter(b => b.status === 'pending');
      console.log(`⏳ Pending bookings: ${pendingBookings.length}`);
      
      if (pendingBookings.length === 0) {
        console.log('⚠️  No pending bookings found. You may need to create a new booking as a seeker.');
      } else {
        console.log('✅ Pending bookings found! These should show approval buttons in View Schedule.');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testViewSchedule();
