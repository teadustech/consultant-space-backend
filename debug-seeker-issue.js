const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function debugSeekerIssue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    // Find Rahul (seeker)
    const rahul = await Seeker.findOne({ email: 'rahul@consultant.com' });
    if (!rahul) {
      console.log('❌ Rahul not found in database');
      return;
    }

    console.log(`\n👤 Rahul Details:`);
    console.log(`   ID: ${rahul._id}`);
    console.log(`   Name: ${rahul.fullName}`);
    console.log(`   Email: ${rahul.email}`);
    console.log(`   Verified: ${rahul.isVerified}`);

    // Create a JWT token exactly like the frontend would
    const token = jwt.sign(
      { userId: rahul._id, userType: 'seeker' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`\n🔑 JWT Token Analysis:`);
    console.log(`   Token: ${token.substring(0, 50)}...`);
    
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log(`   Decoded payload:`, decoded);
    console.log(`   userId type: ${typeof decoded.userId}`);
    console.log(`   userId value: ${decoded.userId}`);

    // Test finding seeker with the decoded userId
    const foundSeeker = await Seeker.findById(decoded.userId);
    if (foundSeeker) {
      console.log(`   ✅ Seeker found using decoded userId: ${foundSeeker.fullName}`);
    } else {
      console.log(`   ❌ Seeker NOT found using decoded userId`);
      
      // Try different variations
      console.log(`\n🔍 Trying different variations:`);
      
      // Try as string
      const seekerAsString = await Seeker.findById(decoded.userId.toString());
      console.log(`   As string: ${seekerAsString ? 'Found' : 'Not found'}`);
      
      // Try as ObjectId
      const mongoose = require('mongoose');
      const seekerAsObjectId = await Seeker.findById(new mongoose.Types.ObjectId(decoded.userId));
      console.log(`   As ObjectId: ${seekerAsObjectId ? 'Found' : 'Not found'}`);
      
      // List all seekers to see what's in the database
      const allSeekers = await Seeker.find({});
      console.log(`\n📋 All seekers in database:`);
      allSeekers.forEach(seeker => {
        console.log(`   - ${seeker.fullName} (${seeker._id}) - ${seeker.email}`);
      });
    }

    // Test the exact logic from the booking route
    console.log(`\n🧪 Testing booking route logic:`);
    const seekerId = decoded.userId;
    console.log(`   seekerId from token: ${seekerId}`);
    console.log(`   seekerId type: ${typeof seekerId}`);
    
    const seekerFromRoute = await Seeker.findById(seekerId);
    if (seekerFromRoute) {
      console.log(`   ✅ Seeker found in route logic: ${seekerFromRoute.fullName}`);
    } else {
      console.log(`   ❌ Seeker NOT found in route logic`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugSeekerIssue();
