import OpenAI from 'openai';
import { uploadToCloudinary } from './cloudinary';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

// Common medications database for validation
const COMMON_MEDICATIONS = [
  'Amoxicillin', 'Ibuprofen', 'Acetaminophen', 'Paracetamol', 'Aspirin',
  'Metformin', 'Atorvastatin', 'Amlodipine', 'Losartan', 'Omeprazole',
  'Levothyroxine', 'Simvastatin', 'Lisinopril', 'Azithromycin', 'Albuterol',
  'Gabapentin', 'Hydrochlorothiazide', 'Metoprolol', 'Prednisone', 'Tramadol',
  'Sertraline', 'Fluticasone', 'Montelukast', 'Citalopram', 'Pantoprazole',
  'Warfarin', 'Insulin', 'Furosemide', 'Clopidogrel', 'Duloxetine'
];

class AIPrescriptionParser {
  
  // Step 1: Extract text from prescription image using OpenAI Vision
  async extractTextFromImage(imageUri) {
    try {
      console.log('🤖 Starting AI text extraction from prescription...');
      
      // Upload image to get a public URL if needed
      let imageUrl = imageUri;
      if (imageUri.startsWith('file://')) {
        const uploadResult = await uploadToCloudinary(imageUri);
        imageUrl = uploadResult.secure_url;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // GPT-4 with vision capabilities
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL text from this prescription image. Focus on:
                - Medication names
                - Dosages (mg, ml, tablets, capsules, etc.)
                - Frequency instructions (daily, twice daily, three times daily, etc.)
                - Duration (days, weeks, months)
                - Special instructions (with food, before meals, at bedtime, etc.)
                - Doctor and patient information
                
                Return the raw extracted text exactly as it appears.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      });

      const extractedText = response.choices[0].message.content;
      console.log('✅ Text extraction completed');
      return extractedText;
      
    } catch (error) {
      console.error('❌ Error extracting text from image:', error);
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }

  // Step 2: Parse prescription text using AI to extract structured medication data
  async parsePrescriptionText(extractedText) {
    try {
      console.log('🧠 Starting AI prescription parsing...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a medical AI assistant specialized in parsing prescription information. 
            Extract medication information from prescription text and return it in the exact JSON format specified.
            
            IMPORTANT PARSING RULES:
            - Always extract the exact medication name as written
            - Parse dosage including unit (mg, ml, tablets, etc.)
            - Convert frequency to standard terms (daily, twice daily, three times daily, etc.)
            - Extract duration if mentioned (7 days, 2 weeks, 1 month, etc.)
            - Include ALL special instructions
            - If information is unclear or missing, use null
            - Be conservative - only extract what you're confident about
            
            FREQUENCY MAPPING:
            - "Once daily", "1x daily", "OD" → "daily"
            - "Twice daily", "2x daily", "BD", "BID" → "twice daily"  
            - "Three times daily", "3x daily", "TDS", "TID" → "three times daily"
            - "Four times daily", "4x daily", "QDS", "QID" → "four times daily"
            - "Every 6 hours" → "every 6 hours"
            - "Every 8 hours" → "every 8 hours"
            - "As needed", "PRN" → "as needed"
            - "At bedtime", "nocte" → "at bedtime"
            - "With meals" → "with meals"
            - "Before meals" → "before meals"`
          },
          {
            role: "user",
            content: `Parse this prescription text and extract medication information in JSON format:

TEXT TO PARSE:
"${extractedText}"

Return a JSON object with this exact structure:
{
  "medications": [
    {
      "name": "exact medication name",
      "dosage": "amount and unit (e.g., 500mg, 1 tablet, 5ml)",
      "frequency": "standardized frequency",
      "duration": "duration if specified (e.g., 7 days, 2 weeks)",
      "instructions": "special instructions (with food, before meals, etc.)",
      "notes": "any additional notes"
    }
  ],
  "doctorInfo": {
    "name": "doctor name if found",
    "practice": "practice/clinic name if found"
  },
  "patientInfo": {
    "name": "patient name if found"
  },
  "prescriptionDate": "date if found"
}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const parsedData = JSON.parse(response.choices[0].message.content);
      console.log('✅ Prescription parsing completed:', parsedData);
      
      // Validate and clean the parsed data
      const validatedData = this.validateParsedData(parsedData);
      return validatedData;
      
    } catch (error) {
      console.error('❌ Error parsing prescription text:', error);
      throw new Error(`Prescription parsing failed: ${error.message}`);
    }
  }

  // Step 3: Validate parsed medication data
  validateParsedData(parsedData) {
    if (!parsedData.medications || !Array.isArray(parsedData.medications)) {
      throw new Error('No medications found in prescription');
    }

    const validatedMedications = parsedData.medications
      .filter(med => med.name && med.dosage) // Only include meds with name and dosage
      .map(med => ({
        ...med,
        name: this.normalizeMedicationName(med.name),
        frequency: med.frequency || 'daily',
        confidence: this.calculateConfidence(med.name)
      }));

    return {
      ...parsedData,
      medications: validatedMedications
    };
  }

  // Normalize medication names and check against common medications
  normalizeMedicationName(name) {
    if (!name) return '';
    
    const normalized = name.trim().toLowerCase();
    
    // Find closest match in common medications
    const closestMatch = COMMON_MEDICATIONS.find(med => 
      med.toLowerCase().includes(normalized) || 
      normalized.includes(med.toLowerCase())
    );
    
    return closestMatch || name; // Return closest match or original name
  }

  // Calculate confidence score based on medication recognition
  calculateConfidence(medicationName) {
    const normalized = medicationName.toLowerCase();
    const isCommonMed = COMMON_MEDICATIONS.some(med => 
      med.toLowerCase() === normalized
    );
    return isCommonMed ? 0.95 : 0.75; // High confidence for known meds
  }

  // Step 4: Generate medication schedules from parsed data
  generateMedicationSchedule(medications, userPreferences = {}) {
    const schedules = [];
    const defaultWakeTime = userPreferences.wakeTime || '08:00';
    const defaultBedTime = userPreferences.bedTime || '22:00';
    const defaultMealTimes = userPreferences.mealTimes || {
      breakfast: '08:00',
      lunch: '13:00',
      dinner: '19:00'
    };

    medications.forEach(med => {
      const times = this.calculateDoseTimes(med.frequency, {
        wakeTime: defaultWakeTime,
        bedTime: defaultBedTime,
        mealTimes: defaultMealTimes,
        instructions: med.instructions
      });

      times.forEach(time => {
        schedules.push({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          time: time,
          instructions: med.instructions || '',
          notes: med.notes || '',
          duration: med.duration,
          confidence: med.confidence || 0.8,
          source: 'ai_prescription_parser',
          isActive: true,
          requiresVerification: med.confidence < 0.9 // Flag low confidence items
        });
      });
    });

    return schedules;
  }

  // Calculate specific dose times based on frequency and user preferences
  calculateDoseTimes(frequency, preferences) {
    const times = [];
    const { wakeTime, bedTime, mealTimes, instructions } = preferences;

    switch (frequency?.toLowerCase()) {
      case 'daily':
      case 'once daily':
        times.push(wakeTime);
        break;
        
      case 'twice daily':
      case 'every 12 hours':
        times.push(wakeTime, '20:00');
        break;
        
      case 'three times daily':
      case 'every 8 hours':
        times.push('08:00', '16:00', '00:00');
        break;
        
      case 'four times daily':
      case 'every 6 hours':
        times.push('08:00', '14:00', '20:00', '02:00');
        break;
        
      case 'with meals':
        times.push(mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner);
        break;
        
      case 'before meals':
        times.push(
          this.subtractMinutes(mealTimes.breakfast, 30),
          this.subtractMinutes(mealTimes.lunch, 30),
          this.subtractMinutes(mealTimes.dinner, 30)
        );
        break;
        
      case 'at bedtime':
        times.push(bedTime);
        break;
        
      case 'as needed':
        times.push('09:00'); // Default time for as-needed medications
        break;
        
      default:
        times.push(wakeTime); // Default to wake time
    }

    return times;
  }

  // Helper function to subtract minutes from time string
  subtractMinutes(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins - minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  // Main function to process prescription image end-to-end
  async processPrescriptionImage(imageUri, userPreferences = {}) {
    try {
      console.log('🚀 Starting complete prescription processing...');
      
      // Step 1: Extract text from image
      const extractedText = await this.extractTextFromImage(imageUri);
      
      // Step 2: Parse extracted text
      const parsedData = await this.parsePrescriptionText(extractedText);
      
      // Step 3: Generate medication schedules
      const medicationSchedules = this.generateMedicationSchedule(
        parsedData.medications,
        userPreferences
      );
      
      console.log('✅ Prescription processing completed successfully');
      
      return {
        success: true,
        extractedText,
        parsedData,
        medicationSchedules,
        totalMedications: medicationSchedules.length
      };
      
    } catch (error) {
      console.error('❌ Prescription processing failed:', error);
      throw error;
    }
  }
}

export const aiPrescriptionParser = new AIPrescriptionParser();
export default aiPrescriptionParser;
