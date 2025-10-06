const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Booking = require('./models/Booking');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-consultant';

async function testBookingFunctionality() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get a consultant
    const consultant = await Consultant.findOne({ email: 'sarah.johnson@consultant.com' });
    if (!consultant) {
      console.log('❌ No consultant found with email: sarah.johnson@consultant.com');
      return;
    }

    console.log(`\n👤 Consultant: ${consultant.fullName}`);
    console.log(`📧 Email: ${consultant.email}`);
    console.log(`💰 Hourly Rate: ₹${consultant.hourlyRate}`);
    console.log(`✅ Available: ${consultant.isAvailable}`);
    console.log(`✅ Verified: ${consultant.isVerified}`);

    // Check working hours
    console.log('\n📅 Working Hours:');
    Object.keys(consultant.workingHours).forEach(day => {
      const hours = consultant.workingHours[day];
      console.log(`  ${day}: ${hours.available ? `${hours.start} - ${hours.end}` : 'Not available'}`);
    });

    // Test availability calculation
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Tomorrow
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Next week

    console.log(`\n🔍 Testing availability for: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Get existing bookings
    const existingBookings = await Booking.findByDateRange(startDate, endDate, consultant._id);
    console.log(`📊 Existing bookings in range: ${existingBookings.length}`);

    // Generate availability manually
    const availability = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const workingHours = consultant.workingHours[dayOfWeek];

      if (workingHours && workingHours.available) {
        const dayAvailability = {
          date: currentDate.toISOString().split('T')[0],
          dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          workingHours: {
            start: workingHours.start,
            end: workingHours.end
          },
          availableSlots: [],
          bookedSlots: []
        };

        // Generate time slots
        const [startHour, startMinute] = workingHours.start.split(':').map(Number);
        const [endHour, endMinute] = workingHours.end.split(':').map(Number);
        
        let currentHour = startHour;
        let currentMinute = startMinute;

        while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
          const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          
          // Check if slot is booked
          const isBooked = existingBookings.some(booking => {
            const bookingDate = booking.sessionDate.toISOString().split('T')[0];
            return bookingDate === dayAvailability.date && 
                   booking.startTime === timeSlot &&
                   ['pending', 'confirmed'].includes(booking.status);
          });

          if (isBooked) {
            dayAvailability.bookedSlots.push(timeSlot);
          } else {
            dayAvailability.availableSlots.push(timeSlot);
          }

          // Move to next slot (30-minute intervals)
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
        }

        availability.push(dayAvailability);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`\n📅 Generated availability for ${availability.length} days:`);
    availability.forEach(day => {
      console.log(`  ${day.date} (${day.dayOfWeek}): ${day.availableSlots.length} available slots`);
      if (day.availableSlots.length > 0) {
        console.log(`    Available: ${day.availableSlots.slice(0, 3).join(', ')}${day.availableSlots.length > 3 ? '...' : ''}`);
      }
    });

    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    const testStartDate = startDate.toISOString().split('T')[0];
    const testEndDate = endDate.toISOString().split('T')[0];
    
    const response = await fetch(`http://localhost:5000/api/bookings/consultant/${consultant._id}/availability?startDate=${testStartDate}&endDate=${testEndDate}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API Response: ${data.availability.length} days of availability`);
    } else {
      console.log(`❌ API Error: ${response.status} - ${response.statusText}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testBookingFunctionality();
}

module.exports = { testBookingFunctionality }; 