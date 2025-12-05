// Common medications database for validation and recognition
export const COMMON_MEDICATIONS = [
  // Antibiotics
  'Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Doxycycline', 'Penicillin',
  'Cephalexin', 'Clindamycin', 'Erythromycin', 'Levofloxacin', 'Metronidazole',
  
  // Pain Relief
  'Acetaminophen', 'Ibuprofen', 'Aspirin', 'Naproxen', 'Diclofenac',
  'Tramadol', 'Codeine', 'Paracetamol',
  
  // Cardiovascular
  'Amlodipine', 'Atorvastatin', 'Lisinopril', 'Losartan', 'Metoprolol',
  'Simvastatin', 'Warfarin', 'Clopidogrel', 'Furosemide', 'Hydrochlorothiazide',
  
  // Diabetes
  'Metformin', 'Insulin', 'Glipizide', 'Pioglitazone',
  
  // Respiratory
  'Albuterol', 'Fluticasone', 'Montelukast', 'Prednisone',
  
  // Mental Health
  'Sertraline', 'Fluoxetine', 'Citalopram', 'Escitalopram', 'Duloxetine',
  
  // Other Common
  'Levothyroxine', 'Gabapentin', 'Omeprazole', 'Pantoprazole'
];

// Medication aliases and brand names
export const MEDICATION_ALIASES = {
  'Tylenol': 'Acetaminophen',
  'Advil': 'Ibuprofen',
  'Motrin': 'Ibuprofen',
  'Lipitor': 'Atorvastatin',
  'Zocor': 'Simvastatin',
  'Norvasc': 'Amlodipine',
  'Synthroid': 'Levothyroxine',
  'Zoloft': 'Sertraline',
  'Prozac': 'Fluoxetine',
  'Nexium': 'Esomeprazole',
  'Prilosec': 'Omeprazole'
};

// Frequency mappings
export const FREQUENCY_MAPPINGS = {
  // Standard terms
  'once daily': 'daily',
  'twice daily': 'twice daily',
  'three times daily': 'three times daily',
  'four times daily': 'four times daily',
  
  // Medical abbreviations
  'od': 'daily',
  'bid': 'twice daily',
  'tid': 'three times daily',
  'qid': 'four times daily',
  'bd': 'twice daily',
  'tds': 'three times daily',
  'qds': 'four times daily',
  
  // Time-based
  'every 12 hours': 'twice daily',
  'every 8 hours': 'three times daily',
  'every 6 hours': 'four times daily',
  'every 24 hours': 'daily',
  
  // Meal-based
  'with meals': 'three times daily',
  'before meals': 'three times daily',
  'after meals': 'three times daily',
  'at bedtime': 'daily',
  'nocte': 'daily',
  
  // As needed
  'as needed': 'as needed',
  'prn': 'as needed',
  'when required': 'as needed'
};

export const normalizeMedicationName = (name) => {
  if (!name) return '';
  
  const normalized = name.trim();
  
  // Check for brand name aliases
  const alias = MEDICATION_ALIASES[normalized];
  if (alias) return alias;
  
  // Find closest match in common medications
  const lowerName = normalized.toLowerCase();
  const closestMatch = COMMON_MEDICATIONS.find(med => 
    med.toLowerCase() === lowerName ||
    med.toLowerCase().includes(lowerName) ||
    lowerName.includes(med.toLowerCase())
  );
  
  return closestMatch || normalized;
};

export const normalizeFrequency = (frequency) => {
  if (!frequency) return 'daily';
  
  const lowerFreq = frequency.toLowerCase().trim();
  
  // Direct mapping
  if (FREQUENCY_MAPPINGS[lowerFreq]) {
    return FREQUENCY_MAPPINGS[lowerFreq];
  }
  
  // Pattern matching
  for (const [pattern, mapped] of Object.entries(FREQUENCY_MAPPINGS)) {
    if (lowerFreq.includes(pattern)) {
      return mapped;
    }
  }
  
  return 'daily'; // Default fallback
};
