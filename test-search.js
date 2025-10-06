const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-consultant';

async function testSearch() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test 1: Check if consultants exist
    const consultantCount = await Consultant.countDocuments();
    console.log(`\n📊 Total consultants in database: ${consultantCount}`);

    if (consultantCount === 0) {
      console.log('❌ No consultants found. Please run add-test-data.js first.');
      return;
    }

    // Test 2: Check verified and available consultants
    const verifiedConsultants = await Consultant.countDocuments({ 
      isVerified: true, 
      isAvailable: true 
    });
    console.log(`✅ Verified and available consultants: ${verifiedConsultants}`);

    // Test 3: Test search by domain
    const softwareConsultants = await Consultant.find({ 
      domain: 'Software',
      isVerified: true,
      isAvailable: true
    }).select('fullName domain experience hourlyRate rating');
    
    console.log(`\n🔍 Software consultants found: ${softwareConsultants.length}`);
    softwareConsultants.forEach(consultant => {
      console.log(`  - ${consultant.fullName} (${consultant.experience} years, ₹${consultant.hourlyRate}/hr, ${consultant.rating}★)`);
    });

    // Test 4: Test search by rating
    const highRatedConsultants = await Consultant.find({ 
      rating: { $gte: 4.5 },
      isVerified: true,
      isAvailable: true
    }).select('fullName domain rating totalReviews');
    
    console.log(`\n⭐ High-rated consultants (4.5+ stars): ${highRatedConsultants.length}`);
    highRatedConsultants.forEach(consultant => {
      console.log(`  - ${consultant.fullName} (${consultant.domain}, ${consultant.rating}★, ${consultant.totalReviews} reviews)`);
    });

    // Test 5: Test search by price range
    const affordableConsultants = await Consultant.find({ 
      hourlyRate: { $lte: 2500 },
      isVerified: true,
      isAvailable: true
    }).select('fullName domain hourlyRate');
    
    console.log(`\n💰 Affordable consultants (≤₹2500/hr): ${affordableConsultants.length}`);
    affordableConsultants.forEach(consultant => {
      console.log(`  - ${consultant.fullName} (${consultant.domain}, ₹${consultant.hourlyRate}/hr)`);
    });

    // Test 6: Test text search
    const searchResults = await Consultant.find({
      $or: [
        { fullName: { $regex: 'Sarah', $options: 'i' } },
        { domain: { $regex: 'Software', $options: 'i' } },
        { expertise: { $regex: 'React', $options: 'i' } }
      ],
      isVerified: true,
      isAvailable: true
    }).select('fullName domain expertise');
    
    console.log(`\n🔎 Text search results for "Sarah" or "Software" or "React": ${searchResults.length}`);
    searchResults.forEach(consultant => {
      console.log(`  - ${consultant.fullName} (${consultant.domain})`);
    });

    // Test 7: Check seekers
    const seekerCount = await Seeker.countDocuments();
    console.log(`\n👥 Total seekers in database: ${seekerCount}`);

    console.log('\n✅ Search functionality test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`- Total consultants: ${consultantCount}`);
    console.log(`- Verified & available: ${verifiedConsultants}`);
    console.log(`- Software domain: ${softwareConsultants.length}`);
    console.log(`- High-rated (4.5+): ${highRatedConsultants.length}`);
    console.log(`- Affordable (≤₹2500): ${affordableConsultants.length}`);
    console.log(`- Total seekers: ${seekerCount}`);

  } catch (error) {
    console.error('❌ Error testing search:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testSearch();
}

module.exports = { testSearch }; 