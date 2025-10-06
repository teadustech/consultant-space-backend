const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');
const Booking = require('./models/Booking');
require('dotenv').config();

async function testAvailabilityLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/go-to-experts', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB successfully');

    // Find Sarah Johnson
    const sarah = await Consultant.findOne({ email: 'sarah@constultant.com' });
    
    if (!sarah) {
      console.log('❌ Sarah Johnson not found');
      return;
    }

    console.log(`\n👤 Testing availability for: ${sarah.fullName} (${sarah._id})`);

    // Test the availability logic directly
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    console.log(`\n📅 Testing availability logic:`);
    console.log(`   Start Date: ${startDate.toISOString().split('T')[0]}`);
    console.log(`   End Date: ${endDate.toISOString().split('T')[0]}`);

    // Get existing bookings in the date range
    const existingBookings = await Booking.findByDateRange(startDate, endDate, sarah._id);
    console.log(`   Existing bookings: ${existingBookings.length}`);

    // Generate availability slots
    const availability = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const workingHours = sarah.workingHours[dayOfWeek];

      console.log(`\n   📅 ${currentDate.toISOString().split('T')[0]} (${dayOfWeek}):`);
      
      if (workingHours && workingHours.available) {
        console.log(`      ✅ Available: ${workingHours.start} - ${workingHours.end}`);
        
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
            console.log(`         ❌ ${timeSlot} - Booked`);
          } else {
            dayAvailability.availableSlots.push(timeSlot);
            console.log(`         ✅ ${timeSlot} - Available`);
          }

          // Move to next slot (30-minute intervals)
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
        }

        availability.push(dayAvailability);
        console.log(`      📊 Total slots: ${dayAvailability.availableSlots.length + dayAvailability.bookedSlots.length}`);
        console.log(`         Available: ${dayAvailability.availableSlots.length}`);
        console.log(`         Booked: ${dayAvailability.bookedSlots.length}`);
      } else {
        console.log(`      ❌ Not available`);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total available days: ${availability.length}`);
    console.log(`   Total available slots: ${availability.reduce((sum, day) => sum + day.availableSlots.length, 0)}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testAvailabilityLogic();
