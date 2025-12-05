// OpenFDA API integration
const OPENFDA_BASE_URL = 'https://api.fda.gov/drug';

export async function checkDrugInteractions(medications) {
  try {
    const activeIngredients = medications.map(med => 
      med.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    // Check each medication against FDA database
    const interactionPromises = activeIngredients.map(async (ingredient) => {
      const response = await fetch(
        `${OPENFDA_BASE_URL}/label.json?search=active_ingredient:"${ingredient}"&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          ingredient,
          warnings: data.results?.[0]?.warnings || [],
          contraindications: data.results?.[0]?.contraindications || []
        };
      }
      return null;
    });

    const results = await Promise.all(interactionPromises);
    return results.filter(result => result !== null);
  } catch (error) {
    console.error('Drug interaction check failed:', error);
    return [];
  }
}

export function analyzeInteractions(interactionData) {
  const risks = [];
  
  interactionData.forEach((drug, index) => {
    interactionData.slice(index + 1).forEach((otherDrug) => {
      // Simple interaction detection logic
      const warningsMatch = drug.warnings.some(warning => 
        otherDrug.warnings.some(otherWarning => 
          warning.toLowerCase().includes(otherWarning.toLowerCase())
        )
      );
      
      if (warningsMatch) {
        risks.push({
          severity: 'moderate',
          medications: [drug.ingredient, otherDrug.ingredient],
          description: 'Potential drug interaction detected. Consult your doctor.'
        });
      }
    });
  });
  
  return risks;
}
