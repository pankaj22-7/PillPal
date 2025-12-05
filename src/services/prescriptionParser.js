// src/services/prescriptionParser.js
import { GoogleVision } from '@google-cloud/vision';
import OpenAI from 'openai';

const prescriptionParser = {
  // Step 1: Extract text from prescription image
  extractTextFromImage: async (imageUri) => {
    const vision = new GoogleVision();
    const [result] = await vision.textDetection(imageUri);
    return result.fullTextAnnotation?.text || '';
  },

  // Step 2: Parse prescription text using AI
  parsePrescriptionText: async (extractedText) => {
    const openai = new OpenAI();
    
    const prompt = `
    Parse this prescription text and extract medication information in JSON format:
    
    Text: "${extractedText}"
    
    Extract for each medication:
    - name: medication name
    - dosage: strength and amount (e.g., "500mg", "1 tablet")
    - frequency: how often (e.g., "twice daily", "every 8 hours")
    - duration: how long to take (e.g., "7 days", "1 month")
    - instructions: special instructions (e.g., "with food", "before meals")
    - times: suggested times based on frequency
    
    Return as JSON array of medications.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
};
