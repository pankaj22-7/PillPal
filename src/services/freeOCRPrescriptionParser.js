import { createWorker } from 'tesseract.js';
import { uploadToCloudinary } from './cloudinary';
import { 
  COMMON_MEDICATIONS, 
  normalizeMedicationName, 
  normalizeFrequency 
} from '../data/medicationDatabase';

class FreeOCRPrescriptionParser {
  constructor() {
    console.log('🆓 Free OCR Prescription Parser initialized');
  }

  // Main processing function
  async processPrescriptionImage(imageUri, userPreferences = {}) {
    try {
      console.log('🚀 Starting FREE prescription processing...');
      
      // Step 1: Extract text using free OCR
      const extractedText = await this.extractTextFromImage(imageUri);
      console.log('✅ Text extraction completed:', extractedText.length, 'characters');
      
      // Step 2: Parse prescription text using rule-based parsing
      const parsedData = await this.parsePrescriptionText(extractedText);
      console.log('✅ Prescription parsing completed:', parsedData.medications.length, 'medications');
      
      // Step 3: Generate medication schedules
      const medicationSchedules = this.generateMedicationSchedule(
        parsedData.medications,
        userPreferences
      );
      console.log('✅ Schedule generation completed:', medicationSchedules.length, 'scheduled doses');
      
      return {
        success: true,
        extractedText,
        parsedData,
        medicationSchedules,
        totalMedications: medicationSchedules.length,
        processingMethod: 'free_ocr_parser',
        cost: 0 // FREE!
      };
      
    } catch (error) {
      console.error('❌ Free prescription processing failed:', error);
      throw new Error(`Processing failed: ${error.message}`);
    }
  }

  // Step 1: Extract text from image using free OCR services
  async extractTextFromImage(imageUri) {
    try {
      // Try primary OCR service (OCR.space)
      return await this.extractTextWithOCRSpace(imageUri);
      
    } catch (primaryError) {
      console.warn('⚠️ Primary OCR failed, trying fallback:', primaryError.message);
      
      // Try fallback OCR service (Tesseract.js)
      try {
        return await this.extractTextWithTesseract(imageUri);
      } catch (fallbackError) {
        console.error('❌ Fallback OCR also failed:', fallbackError.message);
        throw new Error(`All OCR services failed: ${primaryError.message}`);
      }
    }
  }

  // OCR.space implementation (Primary - Free 25k requests/month)
  async extractTextWithOCRSpace(imageUri) {
    try {
      console.log('🔍 Using OCR.space for text extraction...');
      
      // Upload image to get public URL
      const uploadResult = await uploadToCloudinary(imageUri);
      
      // Prepare form data for OCR.space API
      const formData = new FormData();
      formData.append('apikey', process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || 'helloworld');
      formData.append('url', uploadResult.secure_url);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('iscreatesearchablepdf', 'false');
      
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`OCR.space API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.IsErroredOnProcessing) {
        throw new Error(`OCR.space processing error: ${result.ErrorMessage}`);
      }
      
      const extractedText = result.ParsedResults[0]?.ParsedText || '';
      console.log('✅ OCR.space extraction successful');
      
      return extractedText;
      
    } catch (error) {
      console.error('❌ OCR.space extraction failed:', error);
      throw error;
    }
  }

  // Tesseract.js implementation (Fallback - 100% Free & Offline)
  async extractTextWithTesseract(imageUri) {
    try {
      console.log('🔍 Using Tesseract.js for text extraction...');
      
      const worker = await createWorker('eng');
      const result = await worker.recognize(imageUri);
      const extractedText = result.data.text;
      await worker.terminate();
      
      console.log('✅ Tesseract.js extraction successful');
      return extractedText;
      
    } catch (error) {
      console.error('❌ Tesseract.js extraction failed:', error);
      throw error;
    }
  }

  // Step 2: Parse prescription text using enhanced rule-based parsing
  async parsePrescriptionText(extractedText) {
    try {
      console.log('🧠 Starting enhanced medical text parsing...');
      
      const medications = this.extractMedications(extractedText);
      const doctorInfo = this.extractDoctorInfo(extractedText);
      const patientInfo = this.extractPatientInfo(extractedText);
      const prescriptionDate = this.extractPrescriptionDate(extractedText);
      
      return {
        medications,
        doctorInfo,
        patientInfo,
        prescriptionDate,
        processingMethod: 'rule_based_parsing',
        confidence: this.calculateOverallConfidence(medications)
      };
      
    } catch (error) {
      console.error('❌ Text parsing failed:', error);
      throw error;
    }
  }

  // Enhanced medication extraction with medical patterns
  extractMedications(text) {
    const medications = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Enhanced medication patterns for prescriptions
    const medicationPatterns = [
      // Pattern 1: "Medication Name 500mg twice daily"
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(\d+(?:\.\d+)?(?:mg|mcg|g|ml|units|iu))\s+(.+)/i,
      
      // Pattern 2: "Take 1 tablet of Aspirin 100mg daily"
      /(?:take|give)\s+(\d+)\s+(?:tablet|capsule|ml|drop)s?\s+(?:of\s+)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(\d+(?:mg|mcg|g|ml))\s+(.+)/i,
      
      // Pattern 3: "Amoxicillin 500mg - Take twice daily"
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(\d+(?:\.\d+)?(?:mg|mcg|g|ml|units))\s*[-–—]\s*(.+)/i,
      
      // Pattern 4: "1. Medication Name (Strength) - Instructions"
      /\d+\.\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*(?:\()?(\d+(?:\.\d+)?(?:mg|mcg|g|ml|units))(?:\))?\s*[-–—]?\s*(.+)/i,
    ];
    
    for (const line of lines) {
      // Skip non-medication lines
      if (this.isNonMedicationLine(line)) {
        continue;
      }
      
      for (const pattern of medicationPatterns) {
        const match = line.match(pattern);
        if (match) {
          const medication = this.processMedicationMatch(match, line);
          if (medication && this.validateMedication(medication)) {
            medications.push(medication);
            break; // Found a match, move to next line
          }
        }
      }
    }
    
    return this.deduplicateMedications(medications);
  }

  // Process medication match from regex
  processMedicationMatch(match, originalLine) {
    try {
      const [, name, dosage, instructions] = match;
      
      // Extract frequency and duration from instructions
      const frequency = this.extractFrequency(instructions);
      const duration = this.extractDuration(instructions);
      const specialInstructions = this.extractSpecialInstructions(instructions);
      
      return {
        name: normalizeMedicationName(name.trim()),
        dosage: dosage.trim(),
        frequency: normalizeFrequency(frequency),
        duration: duration,
        instructions: specialInstructions,
        notes: originalLine.trim(),
        confidence: this.calculateMedicationConfidence(name, dosage, frequency),
        source: 'rule_based_extraction'
      };
      
    } catch (error) {
      console.warn('Error processing medication match:', error);
      return null;
    }
  }

  // Check if line contains medication information
  isNonMedicationLine(line) {
    const nonMedPatterns = [
      /^(?:patient|dr|doctor|date|address|phone|clinic)/i,
      /^(?:signature|signed|stamp)/i,
      /^(?:follow|return|visit|appointment)/i,
      /^[0-9-/\s]+$/, // Just numbers and dates
      /^\W+$/ // Just punctuation
    ];
    
    return nonMedPatterns.some(pattern => pattern.test(line.trim()));
  }

  // Extract frequency from instruction text
  extractFrequency(instructions) {
    const freqPatterns = [
      /(\b(?:once|1x?)\s+daily\b)|(\bdaily\b)|(\bqd\b)|(\bod\b)/i,
      /(\b(?:twice|2x?)\s+(?:daily|a day)\b)|(\bbid\b)|(\bbd\b)/i,
      /(\b(?:three times|3x?)\s+(?:daily|a day)\b)|(\btid\b)|(\btds\b)/i,
      /(\b(?:four times|4x?)\s+(?:daily|a day)\b)|(\bqid\b)|(\bqds\b)/i,
      /\bevery\s+(\d+)\s+hours?\b/i,
      /\b(?:with|before|after)\s+meals?\b/i,
      /\b(?:at\s+)?bedtime\b|\bnocte\b/i,
      /\bas\s+needed\b|\bprn\b/i
    ];
    
    for (const pattern of freqPatterns) {
      const match = instructions.match(pattern);
      if (match) {
        return match[0].toLowerCase();
      }
    }
    
    return 'daily'; // Default
  }

  // Extract duration from instruction text
  extractDuration(instructions) {
    const durationPattern = /\b(?:for\s+)?(\d+)\s+(day|days|week|weeks|month|months)\b/i;
    const match = instructions.match(durationPattern);
    
    if (match) {
      const [, amount, unit] = match;
      return `${amount} ${unit.toLowerCase()}`;
    }
    
    return null;
  }

  // Extract special instructions
  extractSpecialInstructions(instructions) {
    const specialPatterns = [
      /\b(?:with|after|before)\s+(?:food|meals?|eating)\b/i,
      /\bon\s+empty\s+stomach\b/i,
      /\bat\s+bedtime\b/i,
      /\bwith\s+water\b/i,
      /\bdo\s+not\s+crush\b/i,
      /\bswallow\s+whole\b/i
    ];
    
    const foundInstructions = [];
    for (const pattern of specialPatterns) {
      const match = instructions.match(pattern);
      if (match) {
        foundInstructions.push(match[0]);
      }
    }
    
    return foundInstructions.join(', ') || '';
  }

  // Validate medication information
  validateMedication(medication) {
    // Check if medication name is reasonable (2-30 characters)
    if (!medication.name || medication.name.length < 2 || medication.name.length > 30) {
      return false;
    }
    
    // Check if dosage contains valid units
    const validUnits = ['mg', 'mcg', 'g', 'ml', 'units', 'iu', 'tablet', 'capsule'];
    const hasValidUnit = validUnits.some(unit => 
      medication.dosage.toLowerCase().includes(unit.toLowerCase())
    );
    
    if (!hasValidUnit) {
      return false;
    }
    
    return true;
  }

  // Calculate confidence score for medication extraction
  calculateMedicationConfidence(name, dosage, frequency) {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence if medication is in common database
    if (COMMON_MEDICATIONS.includes(normalizeMedicationName(name))) {
      confidence += 0.3;
    }
    
    // Boost confidence for clear dosage format
    if (/\d+(?:\.\d+)?(?:mg|mcg|g|ml|units|iu)\b/i.test(dosage)) {
      confidence += 0.2;
    }
    
    // Boost confidence for recognized frequency
    if (frequency && frequency !== 'daily') {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.95); // Cap at 95%
  }

  // Remove duplicate medications
  deduplicateMedications(medications) {
    const unique = [];
    const seen = new Set();
    
    for (const med of medications) {
      const key = `${med.name.toLowerCase()}-${med.dosage}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(med);
      }
    }
    
    return unique;
  }

  // Extract doctor information
  extractDoctorInfo(text) {
    const doctorPatterns = [
      /Dr\.?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i,
      /Doctor:?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i,
      /Physician:?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i
    ];
    
    for (const pattern of doctorPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          name: match[1],
          title: 'Dr.'
        };
      }
    }
    
    return { name: null, title: null };
  }

  // Extract patient information
  extractPatientInfo(text) {
    const patientPatterns = [
      /Patient:?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i,
      /Name:?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/i
    ];
    
    for (const pattern of patientPatterns) {
      const match = text.match(pattern);
      if (match) {
        return { name: match[1] };
      }
    }
    
    return { name: null };
  }

  // Extract prescription date
  extractPrescriptionDate(text) {
    const datePatterns = [
      /Date:?\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(\d{1,2}-\d{1,2}-\d{2,4})/,
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // Calculate overall confidence
  calculateOverallConfidence(medications) {
    if (medications.length === 0) return 0;
    
    const totalConfidence = medications.reduce((sum, med) => sum + (med.confidence || 0.5), 0);
    return totalConfidence / medications.length;
  }

  // Step 3: Generate medication schedules
  generateMedicationSchedule(medications, userPreferences = {}) {
    const schedules = [];
    
    const defaultPreferences = {
      wakeTime: '08:00',
      bedTime: '22:00',
      mealTimes: {
        breakfast: '08:00',
        lunch: '13:00',
        dinner: '19:00'
      }
    };
    
    const prefs = { ...defaultPreferences, ...userPreferences };
    
    medications.forEach(med => {
      const times = this.calculateDoseTimes(med.frequency, prefs, med.instructions);
      
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
          source: 'free_ocr_prescription_parser',
          isActive: true,
          requiresVerification: (med.confidence || 0.8) < 0.9
        });
      });
    });
    
    return schedules;
  }

  // Calculate specific dose times based on frequency
  calculateDoseTimes(frequency, preferences, instructions = '') {
    const { wakeTime, bedTime, mealTimes } = preferences;
    
    // Handle meal-related instructions
    if (instructions.toLowerCase().includes('with meals') || 
        instructions.toLowerCase().includes('after meals')) {
      return [mealTimes.breakfast, mealTimes.lunch, mealTimes.dinner];
    }
    
    if (instructions.toLowerCase().includes('before meals')) {
      return [
        this.subtractMinutes(mealTimes.breakfast, 30),
        this.subtractMinutes(mealTimes.lunch, 30),
        this.subtractMinutes(mealTimes.dinner, 30)
      ];
    }
    
    if (instructions.toLowerCase().includes('bedtime') || frequency === 'at bedtime') {
      return [bedTime];
    }
    
    // Standard frequency mapping
    switch (frequency.toLowerCase()) {
      case 'daily':
      case 'once daily':
        return [wakeTime];
        
      case 'twice daily':
        return [wakeTime, '20:00'];
        
      case 'three times daily':
        return ['08:00', '14:00', '20:00'];
        
      case 'four times daily':
        return ['08:00', '12:00', '16:00', '20:00'];
        
      case 'as needed':
        return ['09:00']; // Default time for PRN medications
        
      default:
        return [wakeTime];
    }
  }

  // Helper: Subtract minutes from time string
  subtractMinutes(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins - minutes;
    const newHours = Math.max(0, Math.floor(totalMinutes / 60));
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${Math.max(0, newMins).toString().padStart(2, '0')}`;
  }
}

// Create and export singleton instance
export const freeOCRPrescriptionParser = new FreeOCRPrescriptionParser();
export default freeOCRPrescriptionParser;
