const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const Booking = require('./models/Booking');
const Admin = require('./models/Admin');
require('dotenv').config();

async function checkDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully');

    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Database Collections:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });

    // Count documents in each collection
    const consultantCount = await Consultant.countDocuments();
    const seekerCount = await Seeker.countDocuments();
    const bookingCount = await Booking.countDocuments();
    const adminCount = await Admin.countDocuments();

    console.log('\n📈 Document Counts:');
    console.log(`   - Consultants: ${consultantCount}`);
    console.log(`   - Seekers: ${seekerCount}`);
    console.log(`   - Bookings: ${bookingCount}`);
    console.log(`   - Admins: ${adminCount}`);

    // Show sample consultants
    if (consultantCount > 0) {
      console.log('\n👥 Sample Consultants:');
      const consultants = await Consultant.find().limit(3).select('fullName email domain hourlyRate isAvailable');
      consultants.forEach(consultant => {
        console.log(`   - ${consultant.fullName} (${consultant.email})`);
        console.log(`     Domain: ${consultant.domain}, Rate: ₹${consultant.hourlyRate}/hr, Available: ${consultant.isAvailable}`);
      });
    }

    // Show sample seekers
    if (seekerCount > 0) {
      console.log('\n👤 Sample Seekers:');
      const seekers = await Seeker.find().limit(3).select('fullName email isVerified');
      seekers.forEach(seeker => {
        console.log(`   - ${seeker.fullName} (${seeker.email}) - Verified: ${seeker.isVerified}`);
      });
    }

    // Show sample bookings
    if (bookingCount > 0) {
      console.log('\n📅 Sample Bookings:');
      const bookings = await Booking.find().limit(3)
        .populate('consultant', 'fullName')
        .populate('seeker', 'fullName')
        .select('bookingId status sessionDate startTime amount');
      bookings.forEach(booking => {
        console.log(`   - ${booking.bookingId}: ${booking.consultant?.fullName} → ${booking.seeker?.fullName}`);
        console.log(`     Date: ${booking.sessionDate.toLocaleDateString()}, Time: ${booking.startTime}, Status: ${booking.status}, Amount: ₹${booking.amount}`);
      });
    }

    // Show admin users
    if (adminCount > 0) {
      console.log('\n🔐 Admin Users:');
      const admins = await Admin.find().select('fullName email role isActive');
      admins.forEach(admin => {
        console.log(`   - ${admin.fullName} (${admin.email}) - Role: ${admin.role}, Active: ${admin.isActive}`);
      });
    }

    // Check booking system readiness
    console.log('\n🔧 Booking System Status:');
    
    // Check if consultants have working hours
    const consultantsWithHours = await Consultant.countDocuments({
      'workingHours.monday.available': { $exists: true }
    });
    console.log(`   - Consultants with working hours: ${consultantsWithHours}/${consultantCount}`);

    // Check if there are any pending bookings
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    
    console.log(`   - Pending bookings: ${pendingBookings}`);
    console.log(`   - Confirmed bookings: ${confirmedBookings}`);
    console.log(`   - Completed bookings: ${completedBookings}`);

    // Database health check
    console.log('\n🏥 Database Health Check:');
    const dbStats = await mongoose.connection.db.stats();
    console.log(`   - Database size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Collections: ${dbStats.collections}`);
    console.log(`   - Indexes: ${dbStats.indexes}`);

    console.log('\n✅ Database check completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. If no consultants exist, register some test consultants');
    console.log('   2. If no seekers exist, register some test seekers');
    console.log('   3. If no admins exist, run: node setup-admin.js');
    console.log('   4. Start testing the booking flow');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if MongoDB is running');
    console.log('   2. Verify connection string in .env file');
    console.log('   3. Check network connectivity');
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the check
checkDatabase(); 