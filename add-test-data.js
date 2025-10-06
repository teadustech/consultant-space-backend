const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Consultant = require('./models/Consultant');
const Seeker = require('./models/Seeker');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-consultant';

// Dummy Consultants Data
const dummyConsultants = [
  {
    fullName: "Dr. Sarah Johnson",
    email: "sarah.johnson@consultant.com",
    phone: "+91-9876543210",
    password: "password123",
    domain: "Software",
    experience: 8,
    hourlyRate: 2500,
    rating: 4.8,
    totalReviews: 45,
    expertise: "Full-Stack Development, React, Node.js, AWS",
    bio: "Senior software architect with 8+ years of experience in building scalable web applications. Expert in modern JavaScript frameworks and cloud technologies.",
    isVerified: true,
    isAvailable: true,
    sessionTypes: ['consultation', 'mentoring', 'review'],
    meetingPlatforms: ['google_meet'],
    location: {
      city: "Mumbai",
      state: "Maharashtra",
      country: "India"
    }
  },
  {
    fullName: "Rajesh Kumar",
    email: "rajesh.kumar@consultant.com",
    phone: "+91-8765432109",
    password: "password123",
    domain: "Finance",
    experience: 12,
    hourlyRate: 3500,
    rating: 4.9,
    totalReviews: 67,
    expertise: "Investment Banking, Financial Planning, Risk Management",
    bio: "Certified financial advisor with 12+ years in investment banking and wealth management. Specialized in portfolio optimization and risk assessment.",
    isVerified: true,
    isAvailable: true,
    sessionTypes: ['consultation', 'coaching'],
    meetingPlatforms: ['google_meet'],
    location: {
      city: "Delhi",
      state: "Delhi",
      country: "India"
    }
  },
  {
    fullName: "Advocate Priya Sharma",
    email: "priya.sharma@consultant.com",
    phone: "+91-7654321098",
    password: "password123",
    domain: "Law",
    experience: 15,
    hourlyRate: 4000,
    rating: 4.7,
    totalReviews: 89,
    expertise: "Corporate Law, Intellectual Property, Contract Law",
    bio: "Senior advocate with 15+ years of experience in corporate law and intellectual property rights. Expert in legal compliance and contract negotiations.",
    isVerified: true,
    isAvailable: true,
    sessionTypes: ['consultation', 'review'],
    meetingPlatforms: ['google_meet'],
    location: {
      city: "Bangalore",
      state: "Karnataka",
      country: "India"
    }
  },
  {
    fullName: "Amit Patel",
    email: "amit.patel@consultant.com",
    phone: "+91-6543210987",
    password: "password123",
    domain: "Marketing",
    experience: 6,
    hourlyRate: 2000,
    rating: 4.6,
    totalReviews: 34,
    expertise: "Digital Marketing, SEO, Social Media Strategy",
    bio: "Digital marketing specialist with expertise in SEO, social media marketing, and brand strategy. Helped 50+ businesses grow their online presence.",
    isVerified: true,
    isAvailable: true,
    sessionTypes: ['consultation', 'mentoring', 'coaching'],
    meetingPlatforms: ['google_meet'],
    location: {
      city: "Pune",
      state: "Maharashtra",
      country: "India"
    }
  },
  {
    fullName: "Dr. Meera Reddy",
    email: "meera.reddy@consultant.com",
    phone: "+91-5432109876",
    password: "password123",
    domain: "HR",
    experience: 10,
    hourlyRate: 2800,
    rating: 4.8,
    totalReviews: 56,
    expertise: "Talent Acquisition, Employee Relations, HR Strategy",
    bio: "HR professional with 10+ years in talent management and organizational development. Expert in building high-performing teams and company culture.",
    isVerified: true,
    isAvailable: true,
    sessionTypes: ['consultation', 'coaching'],
    meetingPlatforms: ['google_meet'],
    location: {
      city: "Hyderabad",
      state: "Telangana",
      country: "India"
    }
  },
  {
    fullName: "Vikram Singh",
    email: "vikram.singh@consultant.com",
    phone: "+91-4321098765",
    password: "password123",
    domain: "Admin",
    experience: 7,
    hourlyRate: 1800,
    rating: 4.5,
    totalReviews: 23,
    expertise: "Project Management, Process Optimization, Operations",
    bio: "Operations specialist with 7+ years in project management and process optimization. Expert in streamlining business operations and improving efficiency.",
    isVerified: true,
    isAvailable: true,
    sessionTypes: ['consultation', 'mentoring'],
    meetingPlatforms: ['google_meet'],
    location: {
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India"
    }
  },
  {
    fullName: "Anjali Desai",
    email: "anjali.desai@consultant.com",
    phone: "+91-3210987654",
    password: "password123",
    domain: "Software",
    experience: 5,
    hourlyRate: 2200,
    rating: 4.4,
    totalReviews: 28,
    expertise: "Mobile App Development, Flutter, Firebase",
    bio: "Mobile app developer with 5+ years specializing in Flutter and cross-platform development. Built 30+ apps for startups and enterprises.",
    isVerified: true,
    isAvailable: true,
    sessionTypes: ['consultation', 'mentoring', 'review'],
    meetingPlatforms: ['google_meet'],
    location: {
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India"
    }
  },
  {
    fullName: "Suresh Iyer",
    email: "suresh.iyer@consultant.com",
    phone: "+91-2109876543",
    password: "password123",
    domain: "Finance",
    experience: 9,
    hourlyRate: 3000,
    rating: 4.7,
    totalReviews: 41,
    expertise: "Tax Planning, GST, Business Finance",
    bio: "Chartered Accountant with 9+ years specializing in tax planning and business finance. Expert in GST compliance and financial planning for SMEs.",
    isVerified: true,
    isAvailable: true,
    sessionTypes: ['consultation', 'review'],
    meetingPlatforms: ['google_meet'],
    location: {
      city: "Kolkata",
      state: "West Bengal",
      country: "India"
    }
  }
];

// Dummy Seekers Data
const dummySeekers = [
  {
    fullName: "Rahul Verma",
    email: "rahul.verma@seeker.com",
    phone: "+91-9876543211",
    password: "password123"
  },
  {
    fullName: "Priya Gupta",
    email: "priya.gupta@seeker.com",
    phone: "+91-9876543212",
    password: "password123"
  },
  {
    fullName: "Arjun Malhotra",
    email: "arjun.malhotra@seeker.com",
    phone: "+91-9876543213",
    password: "password123"
  },
  {
    fullName: "Neha Sharma",
    email: "neha.sharma@seeker.com",
    phone: "+91-9876543214",
    password: "password123"
  },
  {
    fullName: "Vikrant Kapoor",
    email: "vikrant.kapoor@seeker.com",
    phone: "+91-9876543215",
    password: "password123"
  },
  {
    fullName: "Ananya Reddy",
    email: "ananya.reddy@seeker.com",
    phone: "+91-9876543216",
    password: "password123"
  },
  {
    fullName: "Karan Singh",
    email: "karan.singh@seeker.com",
    phone: "+91-9876543217",
    password: "password123"
  },
  {
    fullName: "Zara Khan",
    email: "zara.khan@seeker.com",
    phone: "+91-9876543218",
    password: "password123"
  }
];

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function addTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing test data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing test data...');
    await Consultant.deleteMany({ email: { $regex: /@consultant\.com$/ } });
    await Seeker.deleteMany({ email: { $regex: /@seeker\.com$/ } });
    console.log('Existing test data cleared');

    // Add Consultants
    console.log('Adding dummy consultants...');
    for (const consultantData of dummyConsultants) {
      const hashedPassword = await hashPassword(consultantData.password);
      const consultant = new Consultant({
        ...consultantData,
        password: hashedPassword
      });
      await consultant.save();
      console.log(`Added consultant: ${consultantData.fullName}`);
    }

    // Add Seekers
    console.log('Adding dummy seekers...');
    for (const seekerData of dummySeekers) {
      const hashedPassword = await hashPassword(seekerData.password);
      const seeker = new Seeker({
        ...seekerData,
        password: hashedPassword
      });
      await seeker.save();
      console.log(`Added seeker: ${seekerData.fullName}`);
    }

    console.log('\n✅ Test data added successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`- Consultants added: ${dummyConsultants.length}`);
    console.log(`- Seekers added: ${dummySeekers.length}`);

    console.log('\n🔑 Test Login Credentials:');
    console.log('\nConsultants:');
    dummyConsultants.forEach(consultant => {
      console.log(`- ${consultant.fullName}: ${consultant.email} / password123`);
    });

    console.log('\nSeekers:');
    dummySeekers.forEach(seeker => {
      console.log(`- ${seeker.fullName}: ${seeker.email} / password123`);
    });

  } catch (error) {
    console.error('Error adding test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  addTestData();
}

module.exports = { addTestData }; 