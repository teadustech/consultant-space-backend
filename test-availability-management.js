const mongoose = require('mongoose');
const Consultant = require('./models/Consultant');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-consultant';

async function testAvailabilityManagement() {
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

    // Test current working hours
    console.log('\n📅 Current Working Hours:');
    Object.keys(consultant.workingHours).forEach(day => {
      const hours = consultant.workingHours[day];
      console.log(`  ${day}: ${hours.available ? `${hours.start} - ${hours.end}` : 'Not available'}`);
    });

    // Test updating working hours
    console.log('\n🔄 Testing working hours update...');
    
    const updatedWorkingHours = {
      monday: { start: '10:00', end: '18:00', available: true },
      tuesday: { start: '10:00', end: '18:00', available: true },
      wednesday: { start: '10:00', end: '18:00', available: true },
      thursday: { start: '10:00', end: '18:00', available: true },
      friday: { start: '10:00', end: '18:00', available: true },
      saturday: { start: '10:00', end: '16:00', available: true },
      sunday: { start: '10:00', end: '16:00', available: false }
    };

    const updateData = {
      workingHours: updatedWorkingHours,
      minBookingNotice: 4, // hours
      maxBookingAdvance: 60, // days
      isAvailable: true
    };

    const updatedConsultant = await Consultant.findByIdAndUpdate(
      consultant._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    console.log('✅ Working hours updated successfully!');

    // Show updated working hours
    console.log('\n📅 Updated Working Hours:');
    Object.keys(updatedConsultant.workingHours).forEach(day => {
      const hours = updatedConsultant.workingHours[day];
      console.log(`  ${day}: ${hours.available ? `${hours.start} - ${hours.end}` : 'Not available'}`);
    });

    console.log(`\n⚙️ Booking Settings:`);
    console.log(`  Minimum booking notice: ${updatedConsultant.minBookingNotice} hours`);
    console.log(`  Maximum booking advance: ${updatedConsultant.maxBookingAdvance} days`);
    console.log(`  Overall available: ${updatedConsultant.isAvailable ? 'Yes' : 'No'}`);

    // Calculate total available hours
    const totalHours = Object.values(updatedConsultant.workingHours).reduce((total, day) => {
      if (day.available) {
        const start = new Date(`2000-01-01T${day.start}`);
        const end = new Date(`2000-01-01T${day.end}`);
        const diffMs = end - start;
        const diffHours = diffMs / (1000 * 60 * 60);
        return total + diffHours;
      }
      return total;
    }, 0);

    console.log(`\n📊 Total available hours per week: ${totalHours} hours`);

    // Test availability generation
    console.log('\n🔍 Testing availability generation...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Tomorrow
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Next week

    const availability = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const workingHours = updatedConsultant.workingHours[dayOfWeek];

      if (workingHours && workingHours.available) {
        const dayAvailability = {
          date: currentDate.toISOString().split('T')[0],
          dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          workingHours: {
            start: workingHours.start,
            end: workingHours.end
          },
          availableSlots: []
        };

        // Generate time slots
        const [startHour, startMinute] = workingHours.start.split(':').map(Number);
        const [endHour, endMinute] = workingHours.end.split(':').map(Number);
        
        let currentHour = startHour;
        let currentMinute = startMinute;

        while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
          const timeSlot = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
          dayAvailability.availableSlots.push(timeSlot);

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

    console.log(`✅ Generated availability for ${availability.length} days:`);
    availability.forEach(day => {
      console.log(`  ${day.date} (${day.dayOfWeek}): ${day.availableSlots.length} available slots`);
      if (day.availableSlots.length > 0) {
        console.log(`    Available: ${day.availableSlots.slice(0, 3).join(', ')}${day.availableSlots.length > 3 ? '...' : ''}`);
      }
    });

    console.log('\n✅ Availability management test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testAvailabilityManagement();
}

module.exports = { testAvailabilityManagement };
