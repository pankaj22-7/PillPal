// src/services/medicationScheduler.js
const medicationScheduler = {
  // Convert frequency to specific times
  generateScheduleTimes: (frequency, userPreferences = {}) => {
    const schedules = {
      'once daily': ['09:00'],
      'twice daily': ['09:00', '21:00'],
      'three times daily': ['08:00', '14:00', '20:00'],
      'four times daily': ['08:00', '12:00', '16:00', '20:00'],
      'every 6 hours': ['06:00', '12:00', '18:00', '00:00'],
      'every 8 hours': ['08:00', '16:00', '00:00'],
      'every 12 hours': ['09:00', '21:00'],
      'with meals': ['08:00', '13:00', '19:00'], // Breakfast, lunch, dinner
      'before meals': ['07:30', '12:30', '18:30'],
      'at bedtime': ['22:00']
    };
    
    // Apply user preferences (e.g., wake-up time, meal times)
    const defaultTimes = schedules[frequency.toLowerCase()] || ['09:00'];
    return this.adjustTimesToUserPreferences(defaultTimes, userPreferences);
  },

  // Create medication schedule for user's medication list
  createMedicationSchedule: async (parsedMedications, userId) => {
    const scheduledMedications = [];
    
    for (const med of parsedMedications) {
      const times = this.generateScheduleTimes(med.frequency);
      
      // Create multiple entries for medications taken multiple times per day
      for (const time of times) {
        scheduledMedications.push({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          time: time,
          instructions: med.instructions,
          duration: med.duration,
          userId: userId,
          source: 'prescription_ai',
          isActive: true,
          startDate: new Date().toISOString().split('T')[0],
          endDate: this.calculateEndDate(med.duration)
        });
      }
    }
    
    return scheduledMedications;
  },

  calculateEndDate: (duration) => {
    if (!duration) return null;
    
    const today = new Date();
    const durationMatch = duration.match(/(\d+)\s*(day|week|month)s?/i);
    
    if (durationMatch) {
      const [, amount, unit] = durationMatch;
      const days = unit.toLowerCase() === 'week' ? parseInt(amount) * 7 :
                   unit.toLowerCase() === 'month' ? parseInt(amount) * 30 :
                   parseInt(amount);
      
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + days);
      return endDate.toISOString().split('T')[0];
    }
    
    return null;
  }
};
