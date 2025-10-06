const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Booking = require('./models/Booking');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/consultant_platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function setupTestData() {
  try {
    console.log('🔧 Setting up test data...\n');

    // Check if test users already exist
    let consultant = await Consultant.findOne({ email: 'test.consultant@example.com' });
    let seeker = await Seeker.findOne({ email: 'test.seeker@example.com' });

    // Create test consultant if not exists
    if (!consultant) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      consultant = new Consultant({
        fullName: 'Test Consultant',
        email: 'test.consultant@example.com',
        password: hashedPassword,
        phone: '+91-9876543210',
        domain: 'Software Development',
        experience: 5,
        hourlyRate: 1500,
        bio: 'Experienced software developer with expertise in web development',
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
        isApproved: true
      });
      await consultant.save();
      console.log('✅ Test consultant created');
    } else {
      console.log('✅ Test consultant already exists');
    }

    // Create test seeker if not exists
    if (!seeker) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      seeker = new Seeker({
        fullName: 'Test Seeker',
        email: 'test.seeker@example.com',
        password: hashedPassword,
        phone: '+91-9876543211',
        company: 'Test Company',
        position: 'Developer'
      });
      await seeker.save();
      console.log('✅ Test seeker created');
    } else {
      console.log('✅ Test seeker already exists');
    }

    // Create a test booking for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const existingBooking = await Booking.findOne({
      consultant: consultant._id,
      seeker: seeker._id,
      sessionDate: tomorrow
    });

    if (!existingBooking) {
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
      console.log('✅ Test booking created');
    } else {
      console.log('✅ Test booking already exists');
    }

    console.log('\n📋 Test Data Summary:');
    console.log(`   Consultant: ${consultant.fullName} (${consultant.email})`);
    console.log(`   Seeker: ${seeker.fullName} (${seeker.email})`);
    console.log(`   Booking Date: ${tomorrow.toDateString()}`);
    console.log(`   Booking Time: 10:00 - 11:00`);
    console.log(`   Booking Status: pending`);
    console.log(`   Booking Amount: ₹1500`);
    
    console.log('\n🔑 Login Credentials:');
    console.log(`   Consultant: ${consultant.email} / password123`);
    console.log(`   Seeker: ${seeker.email} / password123`);

    console.log('\n✅ Test data setup complete! You can now:');
    console.log('   1. Login as consultant and go to View Schedule');
    console.log('   2. You should see the pending booking with Approve/Reject buttons');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    mongoose.connection.close();
  }
}

setupTestData();
