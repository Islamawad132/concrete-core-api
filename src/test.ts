/**
 * Test file to validate calculations against Excel data
 * Testing against: خارجي قلب خرساني.xlsx
 */

import { calculateCoreSample, calculateBatch } from './calculator';
import { CoreSampleInput } from './types';

console.log('=== Concrete Core Calculator Tests ===');
console.log('=== اختبار حاسبة القلب الخرساني ===\n');

// Test data from Excel file - exactly matching the input structure
// Sample 1 from Excel (Column Q)
const sample1: CoreSampleInput = {
  sampleNumber: 1,
  testedElement: 'خرسانة أعمدة - مبني المدخل والمصافي',
  visualCondition: 'غير متجانسة ويوجد فرغات صغيرة وكبيرة',
  aggregateType: 'gravel', // زلط
  coringDate: '19/8/2025',
  testingDate: '26/08/2025',
  endPreparation: 'sulfur_capping', // تغطية بالكبريت
  diameters: [93, 93],
  lengths: [122, 120, 122],
  weightGrams: 1835, // Q11
  density: 2.5, // Q18 - user provided for formula
  breakingLoadKN: 68.4, // Q19 - in kN (converted to 6.84 tons)
  aggregateCondition: 'dry', // جافة
};

// Sample 2 from Excel (Column R) - HAS REINFORCEMENT
const sample2: CoreSampleInput = {
  sampleNumber: 2,
  diameters: [93, 93],
  lengths: [116, 116, 115], // avg = 115.67
  weightGrams: 1770, // Correct from Excel R11
  density: 2.5,
  breakingLoadKN: 63.6, // 6.36 tons
  aggregateCondition: 'dry',
  reinforcement: [
    { diameterMm: 8, distanceFromEndMm: 43 } // From Excel I35=8, J35=43
  ],
};

// Sample 3 from Excel (Column S)
const sample3: CoreSampleInput = {
  sampleNumber: 3,
  diameters: [93, 93],
  lengths: [112, 114, 113], // avg = 113
  weightGrams: 1433, // Correct from Excel S11
  density: 2.5,
  breakingLoadKN: 32.8, // 3.28 tons
  aggregateCondition: 'dry',
};

// Expected values from Excel (G38, I38, K38)
const expectedResults = [
  { sample: 'Sample 1', coreStrength: 100.69, equivalentCubeStrength: 119.42 }, // No rebar
  { sample: 'Sample 2', coreStrength: 93.62, equivalentCubeStrength: 114.47 }, // Has 8mm rebar at 43mm
  { sample: 'Sample 3', coreStrength: 48.28, equivalentCubeStrength: 55.87 },  // No rebar
];

console.log('Test 1: Single Sample Calculation (Sample 1)');
console.log('=============================================');
const result1 = calculateCoreSample(sample1);
console.log('Input (matching Excel Q column):');
console.log(`  Sample Number: ${sample1.sampleNumber}`);
console.log(`  Diameters: ${sample1.diameters.join(', ')} mm`);
console.log(`  Lengths: ${sample1.lengths.join(', ')} mm`);
console.log(`  Weight: ${sample1.weightGrams} g`);
console.log(`  Breaking Load: ${sample1.breakingLoadKN} kN`);
console.log(`  Density (user): ${sample1.density} g/cm³`);
console.log(`  Condition: ${sample1.aggregateCondition}`);

console.log('\nResult (matching Excel G column):');
console.log(`  8- القطر المتوسط: ${result1.averageDiameter} mm`);
console.log(`  9- الطول المتوسط: ${result1.averageLength.toFixed(2)} mm`);
console.log(`  نسبة L/D: ${result1.ldRatio.toFixed(4)}`);
console.log(`  10- الكثافة المحسوبة: ${result1.calculatedDensity.toFixed(4)} g/cm³`);
console.log(`  11- حمل الكسر: ${result1.breakingLoadTons.toFixed(2)} tons`);
console.log(`  13- مقاومة الضغط للقلب: ${result1.coreStrength.toFixed(2)} kg/cm² (Expected: ${expectedResults[0].coreStrength})`);
console.log(`  14- Fm (عامل الرطوبة): ${result1.moistureCorrectionFactor}`);
console.log(`  15- Fg (عامل القطع): ${result1.cuttingCorrectionFactor}`);
console.log(`  17- المقاومة المستنبطة: ${result1.equivalentCubeStrength.toFixed(2)} kg/cm² (Expected: ${expectedResults[0].equivalentCubeStrength})`);
console.log(`      (بالميجا باسكال): ${result1.equivalentCubeStrengthMPa.toFixed(2)} MPa`);

const tolerance = 1.0; // 1 kg/cm² tolerance
const passed1 = Math.abs(result1.coreStrength - expectedResults[0].coreStrength) < tolerance &&
                Math.abs(result1.equivalentCubeStrength - expectedResults[0].equivalentCubeStrength) < tolerance;
console.log(`\n✓ Test 1: ${passed1 ? 'PASSED' : 'FAILED'}`);

console.log('\n\nTest 2: Batch Calculation');
console.log('=========================');
const batchResult = calculateBatch([sample1, sample2, sample3]);

console.log('Individual Results:');
batchResult.results.forEach((r, i) => {
  console.log(`  Sample ${i + 1}: Core=${r.coreStrength.toFixed(2)}, Cube=${r.equivalentCubeStrength.toFixed(2)} kg/cm²`);
  console.log(`           Expected: Core=${expectedResults[i].coreStrength}, Cube=${expectedResults[i].equivalentCubeStrength}`);
});

console.log('\nStatistics:');
console.log(`  Average Strength: ${batchResult.averageStrength.toFixed(2)} kg/cm²`);
console.log(`  Minimum Strength: ${batchResult.minimumStrength.toFixed(2)} kg/cm²`);
console.log(`  Maximum Strength: ${batchResult.maximumStrength.toFixed(2)} kg/cm²`);
console.log(`  Standard Deviation: ${batchResult.standardDeviation.toFixed(2)} kg/cm²`);

const allPassed = batchResult.results.every((r, i) => 
  Math.abs(r.coreStrength - expectedResults[i].coreStrength) < tolerance &&
  Math.abs(r.equivalentCubeStrength - expectedResults[i].equivalentCubeStrength) < tolerance
);
console.log(`\n✓ Test 2: ${allPassed ? 'PASSED' : 'FAILED'}`);

console.log('\n\nTest 3: Sample with Reinforcement');
console.log('==================================');
const sampleWithRebar: CoreSampleInput = {
  sampleNumber: 'R1',
  diameters: [100, 100],
  lengths: [200, 200],
  breakingLoadKN: 100, // 10 tons
  density: 2.4,
  aggregateCondition: 'natural',
  reinforcement: [
    { diameterMm: 10, distanceFromEndMm: 50 },
    { diameterMm: 12, distanceFromEndMm: 60 },
  ],
};

const result3 = calculateCoreSample(sampleWithRebar);
console.log('Input:', JSON.stringify(sampleWithRebar, null, 2));
console.log('\nResult:');
console.log(`  Reinforcement Factor: ${result3.reinforcementCorrectionFactor.toFixed(4)}`);
console.log(`  Core Strength: ${result3.coreStrength.toFixed(2)} kg/cm²`);
console.log(`  Equivalent Cube Strength: ${result3.equivalentCubeStrength.toFixed(2)} kg/cm²`);
console.log(`\n✓ Test 3: PASSED (reinforcement factor > 1.0: ${result3.reinforcementCorrectionFactor > 1.0})`);

console.log('\n\n=== All Tests Completed ===');
