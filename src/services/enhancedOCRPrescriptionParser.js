import { createWorker } from 'tesseract.js';
import { uploadToCloudinary } from './cloudinary';
import { 
  COMMON_MEDICATIONS, 
  normalizeMedicationName, 
  normalizeFrequency 
} from '../data/medicationDatabase';

class PrescriptionSpecificParser {
  constructor() {
    console.log('🆓 Prescription-Specific Parser initialized for demo format');
  }

  async processPrescriptionImage(imageUri, userPreferences = {}) {
    try {
      console.log('🚀 Starting prescription-specific processing...');
      
      // Step 1: Extract text with optimized settings
      const extractedText = await this.extractTextFromImage(imageUri);
      console.log('📝 Raw OCR Text:', extractedText);
      
      if (!extractedText || extractedText.trim().length < 10) {
        throw new Error('Insufficient text extracted from image. Please try a clearer image.');
      }
      
      // Step 2: Parse medications with prescription-specific patterns
      const parsedData = this.parsePrescriptionText(extractedText);
      console.log('💊 Extracted medications:', parsedData.medications);
      
      // Step 3: Generate schedules
      const medicationSchedules = this.generateMedicationSchedule(
        parsedData.medications,
        userPreferences
      );
      
      return {
        success: true,
        extractedText,
        parsedData,
        medicationSchedules,
        totalMedications: medicationSchedules.length,
        processingMethod: 'prescription_specific_parser',
        cost: 0
      };
      
    } catch (error) {
      console.error('❌ Prescription-specific processing failed:', error);
      throw error;
    }
  }

  async extractTextFromImage(imageUri) {
    try {
      console.log('🔍 Using OCR.space with prescription-optimized settings...');
      return await this.extractTextWithOCRSpace(imageUri);
    } catch (ocrSpaceError) {
      console.warn('⚠️ OCR.space failed, trying Tesseract:', ocrSpaceError.message);
      try {
        return await this.extractTextWithTesseract(imageUri);
      } catch (tesseractError) {
        throw new Error(`All OCR methods failed: ${ocrSpaceError.message}`);
      }
    }
  }

  async extractTextWithOCRSpace(imageUri) {
    const uploadResult = await uploadToCloudinary(imageUri);
    
    const formData = new FormData();
    formData.append('apikey', process.env.EXPO_PUBLIC_OCR_API_KEY || 'helloworld');
    formData.append('url', uploadResult.secure_url);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 for better accuracy
    formData.append('isTable', 'true'); // Enable table detection for structured prescriptions
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.IsErroredOnProcessing) {
      throw new Error(`OCR.space error: ${data.ErrorMessage}`);
    }
    
    const extractedText = data.ParsedResults[0]?.ParsedText || '';
    
    if (!extractedText.trim()) {
      throw new Error('OCR.space returned empty text');
    }
    
    console.log('✅ OCR.space extraction successful');
    return extractedText;
  }

  async extractTextWithTesseract(imageUri) {
    console.log('🔍 Using Tesseract.js with prescription settings...');
    
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    // Optimize for prescription tables
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,():-/[] ',
      tessedit_pageseg_mode: '6', // Uniform block of text
      preserve_interword_spaces: '1'
    });
    
    const result = await worker.recognize(imageUri);
    const extractedText = result.data.text;
    
    await worker.terminate();
    
    console.log('✅ Tesseract extraction successful');
    return extractedText;
  }

  parsePrescriptionText(text) {
    const medications = this.extractMedications(text);
    const doctorInfo = this.extractDoctorInfo(text);
    const patientInfo = this.extractPatientInfo(text);
    const prescriptionDate = this.extractPrescriptionDate(text);
    const advice = this.extractAdvice(text);
    const confidence = this.calculateOverallConfidence(medications);
    
    return {
      medications,
      doctorInfo,
      patientInfo,
      prescriptionDate,
      advice,
      confidence,
      processingMethod: 'prescription_specific_parsing'
    };
  }

  extractMedications(text) {
    console.log('🔍 Starting prescription-specific medication extraction...');
    
    const medications = [];
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`📄 Processing ${lines.length} lines`);
    
    // Prescription-specific patterns for the demo format
    const patterns = [
      // Pattern 1: "1) TAB. DEMO MEDICINE 1 1 Morning, 1 Night (Before Food) 10 Days"
      {
        regex: /(\d+)\)\s*(TAB|CAP|SYR|INJ)\.?\s*([A-Z\s]+\d*)\s+(.+)/i,
        name: 3, dosage: 'TAB/CAP', instructions: 4
      },
      
      // Pattern 2: "TAB. MEDICINE NAME dosage frequency duration"
      {
        regex: /(TAB|CAP|SYR|INJ)\.?\s*([A-Z\s]+\d*)\s+([\d\/]+)\s*(Morning|Night|Aft|Eve|Before|After)(.+)/i,
        name: 2, dosage: 3, instructions: 4 + 5
      },
      
      // Pattern 3: "Medicine Name - frequency (timing) - duration"
      {
        regex: /([A-Z][A-Z\s]+\d*)\s*[-–]\s*(.+)\s*[-–]\s*(\d+\s*(?:Days?|Weeks?|Months?))/i,
        name: 1, dosage: '1 tablet', instructions: 2, duration: 3
      },
      
      // Pattern 4: General medicine pattern
      {
        regex: /([A-Z][A-Z\s]{3,25})\s+([\d\/]+)\s+(.+)/i,
        name: 1, dosage: 2, instructions: 3
      }
    ];
    
    for (const [lineIndex, line] of lines.entries()) {
      // Skip non-medication lines
      if (this.isNonMedicationLine(line)) {
        console.log(`❌ Skipped line ${lineIndex + 1}: "${line}"`);
        continue;
      }
      
      console.log(`🔍 Processing line ${lineIndex + 1}: "${line}"`);
      
      for (const [patternIndex, pattern] of patterns.entries()) {
        const match = line.match(pattern.regex);
        if (match) {
          console.log(`✅ Pattern ${patternIndex + 1} matched:`, match[0]);
          
          const medicationName = this.cleanMedicationName(match[pattern.name] || '');
          const dosageInfo = match[pattern.dosage] || '1 tablet';
          const instructionsText = match[pattern.instructions] || '';
          
          const medication = {
            name: medicationName,
            dosage: this.parseDosage(dosageInfo, instructionsText),
            frequency: this.extractFrequency(instructionsText),
            duration: this.extractDuration(instructionsText),
            instructions: this.extractSpecialInstructions(instructionsText),
            timing: this.extractTiming(instructionsText),
            notes: line,
            confidence: this.calculateMedicationConfidence(medicationName, dosageInfo),
            source: 'prescription_specific_extraction'
          };
          
          if (this.validateMedication(medication) && !this.isDuplicate(medication, medications)) {
            medications.push(medication);
            console.log('💊 Added medication:', medication.name);
            break;
          }
        }
      }
    }
    
    console.log(`🎯 Total medications extracted: ${medications.length}`);
    return medications;
  }

  cleanMedicationName(name) {
    if (!name) return '';
    
    // Remove common prefixes and clean up
    return name
      .replace(/^(TAB|CAP|SYR|INJ)\.?\s*/i, '')
      .replace(/DEMO\s+MEDICINE/i, 'Medicine')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parseDosage(dosageInfo, instructions) {
    // Handle fractional dosages like "1/2"
    if (dosageInfo.includes('/')) {
      return `${dosageInfo} tablet`;
    }
    
    // Handle standard dosages
    if (/^\d+$/.test(dosageInfo)) {
      return `${dosageInfo} tablet`;
    }
    
    // Extract from instructions if needed
    const dosageMatch = instructions.match(/(\d+(?:\/\d+)?)\s*(tablet|capsule|tab|cap)/i);
    if (dosageMatch) {
      return `${dosageMatch[1]} ${dosageMatch[2]}`;
    }
    
    return '1 tablet'; // Default
  }

  extractFrequency(instructions) {
    console.log('🔍 Extracting frequency from:', instructions);
    
    // Count occurrences of timing words
    const morningCount = (instructions.match(/morning/gi) || []).length;
    const nightCount = (instructions.match(/night/gi) || []).length;
    const afternoonCount = (instructions.match(/aft|afternoon/gi) || []).length;
    const eveningCount = (instructions.match(/eve|evening/gi) || []).length;
    
    const totalDoses = morningCount + nightCount + afternoonCount + eveningCount;
    
    if (totalDoses >= 4) return 'four times daily';
    if (totalDoses === 3) return 'three times daily';
    if (totalDoses === 2) return 'twice daily';
    if (totalDoses === 1) return 'daily';
    
    // Fallback patterns
    const freqPatterns = [
      { pattern: /\b(?:twice|2x?)\s+(?:daily|a day)\b|\bbid\b|\bbd\b/i, frequency: 'twice daily' },
      { pattern: /\b(?:three times|3x?)\s+(?:daily|a day)\b|\btid\b|\btds\b/i, frequency: 'three times daily' },
      { pattern: /\b(?:four times|4x?)\s+(?:daily|a day)\b|\bqid\b|\bqds\b/i, frequency: 'four times daily' },
      { pattern: /\b(?:once|1x?)\s+daily\b|\bdaily\b|\bqd\b|\bod\b/i, frequency: 'daily' }
    ];
    
    for (const { pattern, frequency } of freqPatterns) {
      if (pattern.test(instructions)) {
        return frequency;
      }
    }
    
    return 'daily';
  }

  extractTiming(instructions) {
    const timings = [];
    
    if (/morning/i.test(instructions)) timings.push('morning');
    if (/aft|afternoon/i.test(instructions)) timings.push('afternoon');
    if (/eve|evening/i.test(instructions)) timings.push('evening');
    if (/night/i.test(instructions)) timings.push('night');
    
    return timings.join(', ') || 'with meals';
  }

  extractDuration(instructions) {
    const durationPattern = /(\d+)\s*(day|days|week|weeks|month|months)/i;
    const match = instructions.match(durationPattern);
    
    if (match) {
      return `${match[1]} ${match[2].toLowerCase()}`;
    }
    
    return null;
  }

  extractSpecialInstructions(instructions) {
    const specialInstructions = [];
    
    if (/before\s+food/i.test(instructions)) {
      specialInstructions.push('before food');
    }
    
    if (/after\s+food/i.test(instructions)) {
      specialInstructions.push('after food');
    }
    
    if (/with\s+food/i.test(instructions)) {
      specialInstructions.push('with food');
    }
    
    if (/empty\s+stomach/i.test(instructions)) {
      specialInstructions.push('on empty stomach');
    }
    
    return specialInstructions.join(', ');
  }

  extractAdvice(text) {
    const advicePatterns = [
      /Advice\s*Given?\s*:?\s*(.+)/i,
      /Note\s*:?\s*(.+)/i,
      /AVOID\s+(.+)/i
    ];
    
    for (const pattern of advicePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  isNonMedicationLine(line) {
    const nonMedPatterns = [
      /^(?:patient|dr|doctor|date|address|phone|clinic)/i,
      /^(?:signature|signed|stamp)/i,
      /^(?:follow|return|visit|appointment)/i,
      /^(?:advice|note)/i,
      /^[0-9-/\s]+$/, // Just numbers and dates
      /^\W+$/, // Just punctuation
      /^(?:medicine\s+name|dosage|duration)/i, // Table headers
      /temp|bp|pulse/i // Vital signs
    ];
    
    return nonMedPatterns.some(pattern => pattern.test(line.trim()));
  }

  // Rest of the methods remain the same as previous implementation
  validateMedication(medication) {
    if (!medication.name || medication.name.length < 2) return false;
    return true;
  }

  calculateMedicationConfidence(name, dosage) {
    let confidence = 0.7; // Base confidence for prescription format
    
    if (name && name.length > 2) confidence += 0.2;
    if (dosage && dosage !== '1 tablet') confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  isDuplicate(medication, existing) {
    return existing.some(med => 
      med.name.toLowerCase() === medication.name.toLowerCase()
    );
  }

  extractDoctorInfo(text) {
    const patterns = [
      /Dr\.?\s+([A-Za-z]+(?:\s[A-Za-z]+)*)/i,
      /([A-Za-z]+\s+[A-Za-z]+)\s+M\.?B\.?B\.?S/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return { name: match[1], title: 'Dr.' };
      }
    }
    
    return { name: null, title: null };
  }

  extractPatientInfo(text) {
    const patterns = [
      /Patient\s*:?\s*([A-Za-z]+(?:\s[A-Za-z]+)*)/i,
      /ID\s*:\s*\d+\s*-\s*([A-Z\s]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return { name: match[1].trim() };
      }
    }
    
    return { name: null };
  }

  extractPrescriptionDate(text) {
    const patterns = [
      /Date\s*:?\s*(\d{1,2}-\w{3}-\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{1,2}-\d{1,2}-\d{4})/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  calculateOverallConfidence(medications) {
    if (!medications || medications.length === 0) return 0;
    
    const totalConfidence = medications.reduce((sum, med) => sum + (med.confidence || 0.7), 0);
    return totalConfidence / medications.length;
  }

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
      const times = this.calculateDoseTimesFromTiming(med.timing, med.frequency, prefs, med.instructions);
      
      times.forEach(time => {
        schedules.push({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          time: time,
          instructions: med.instructions || '',
          timing: med.timing || '',
          notes: med.notes || '',
          duration: med.duration,
          confidence: med.confidence || 0.7,
          source: 'prescription_specific_parser',
          isActive: true,
          requiresVerification: (med.confidence || 0.7) < 0.8
        });
      });
    });
    
    return schedules;
  }

  calculateDoseTimesFromTiming(timing, frequency, preferences, instructions = '') {
    const { wakeTime, bedTime, mealTimes } = preferences;
    const times = [];
    
    // Handle before/after food timing
    const beforeFood = instructions.includes('before food');
    const afterFood = instructions.includes('after food');
    
    if (timing) {
      const timingParts = timing.toLowerCase().split(',').map(t => t.trim());
      
      for (const part of timingParts) {
        if (part.includes('morning')) {
          if (beforeFood) {
            times.push(this.subtractMinutes(mealTimes.breakfast, 30));
          } else if (afterFood) {
            times.push(this.addMinutes(mealTimes.breakfast, 30));
          } else {
            times.push('08:00');
          }
        }
        
        if (part.includes('afternoon')) {
          if (beforeFood) {
            times.push(this.subtractMinutes(mealTimes.lunch, 30));
          } else if (afterFood) {
            times.push(this.addMinutes(mealTimes.lunch, 30));
          } else {
            times.push('14:00');
          }
        }
        
        if (part.includes('evening')) {
          if (beforeFood) {
            times.push(this.subtractMinutes(mealTimes.dinner, 30));
          } else if (afterFood) {
            times.push(this.addMinutes(mealTimes.dinner, 30));
          } else {
            times.push('18:00');
          }
        }
        
        if (part.includes('night')) {
          times.push('22:00');
        }
      }
    }
    
    // Fallback to frequency-based timing if no specific timing found
    if (times.length === 0) {
      switch (frequency) {
        case 'daily':
          times.push(wakeTime);
          break;
        case 'twice daily':
          times.push(wakeTime, '20:00');
          break;
        case 'three times daily':
          times.push('08:00', '14:00', '20:00');
          break;
        case 'four times daily':
          times.push('08:00', '12:00', '16:00', '20:00');
          break;
        default:
          times.push(wakeTime);
      }
    }
    
    return times;
  }

  subtractMinutes(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins - minutes;
    const newHours = Math.max(0, Math.floor(totalMinutes / 60));
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${Math.max(0, newMins).toString().padStart(2, '0')}`;
  }

  addMinutes(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }
}

export const prescriptionSpecificParser = new PrescriptionSpecificParser();
export default prescriptionSpecificParser;
