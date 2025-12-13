/**
 * Concrete Core Strength Calculator
 * Implementation based on Egyptian Standard for Concrete Core Testing
 * معهد بحوث مواد البناء و ضبط الجودة
 * 
 * Reference Standards:
 * - ECP 203-2020 (Egyptian Code for Design and Construction of Concrete Structures)
 * - BS EN 12504-1 (Testing concrete in structures - Cored specimens)
 * - ASTM C42 (Standard Test Method for Obtaining and Testing Drilled Cores)
 */

import {
  CoreSampleInput,
  CoreSampleResult,
  AggregateCondition,
  BatchCalculationResult,
  LDCorrectionTable,
  MoistureCorrectionTable,
} from './types';

/**
 * L/D Ratio Correction Factor Table
 * Based on interpolation for L/D ratios between 1.0 and 2.0
 * When L/D < 2.0, the apparent strength is higher than true strength
 * 
 * Values from Excel: 
 * L/D=1.5 -> 1.07, L/D=2.0 -> 1.05, L/D=2.5 -> 1.04, L/D=3.0 -> 1.03, L/D=3.5 -> 1.02
 * Note: These are expressed as (L/D * 10) in the Excel
 */
const LD_CORRECTION_TABLE: LDCorrectionTable[] = [
  { ldRatio: 1.5, correctionFactor: 1.07 },
  { ldRatio: 2.0, correctionFactor: 1.05 },
  { ldRatio: 2.5, correctionFactor: 1.04 },
  { ldRatio: 3.0, correctionFactor: 1.03 },
  { ldRatio: 3.5, correctionFactor: 1.02 },
];

/**
 * Moisture Condition Correction Factors
 * Based on aggregate moisture state at time of testing
 */
const MOISTURE_CORRECTION_TABLE: MoistureCorrectionTable[] = [
  { condition: 'dry', conditionArabic: 'جافة', factor: 0.96 },
  { condition: 'natural', conditionArabic: 'طبيعية', factor: 1.00 },
  { condition: 'saturated', conditionArabic: 'مشبعة', factor: 1.05 },
];

/**
 * Fg (Cutting Correction Factor) Interpolation Table
 * From: interpolation حسابات قلب خرساني.xlsx
 * 
 * Fg depends on:
 * - Core Diameter (50, 75, 100, 125, 150 mm)
 * - Core Strength (15, 20, 25, 30, 35 N/mm² = MPa)
 * 
 * Note: For strengths < 15 MPa, use the 15 MPa value
 * For intermediate values, use linear interpolation
 */
const FG_STRENGTH_POINTS = [15, 20, 25, 30, 35]; // N/mm² (MPa)
const FG_DIAMETER_POINTS = [50, 75, 100, 125, 150]; // mm

const FG_TABLE: Record<number, number[]> = {
  // diameter: [Fg at 15, 20, 25, 30, 35 MPa]
  50:  [1.18, 1.15, 1.14, 1.11, 1.08],
  75:  [1.15, 1.13, 1.11, 1.09, 1.07],
  100: [1.12, 1.10, 1.08, 1.07, 1.06],
  125: [1.09, 1.07, 1.06, 1.05, 1.04],
  150: [1.07, 1.05, 1.04, 1.03, 1.02],
};

/**
 * Linear interpolation helper
 */
function linearInterpolate(x: number, x1: number, x2: number, y1: number, y2: number): number {
  return y1 + (x - x1) * (y2 - y1) / (x2 - x1);
}

/**
 * Calculates Fg (cutting correction factor) using bilinear interpolation
 * Based on core diameter and core strength
 * 
 * @param diameterMm - Core diameter in mm
 * @param strengthMPa - Core strength in MPa (N/mm²)
 * @returns Fg correction factor
 */
export function calculateFgCorrectionFactor(diameterMm: number, strengthMPa: number): number {
  // Clamp strength to table range (use 15 for anything below)
  const clampedStrength = Math.max(15, Math.min(35, strengthMPa));
  
  // Clamp diameter to table range
  const clampedDiameter = Math.max(50, Math.min(150, diameterMm));
  
  // Find diameter interval
  let dLowerIdx = 0;
  for (let i = 0; i < FG_DIAMETER_POINTS.length - 1; i++) {
    if (clampedDiameter >= FG_DIAMETER_POINTS[i] && clampedDiameter <= FG_DIAMETER_POINTS[i + 1]) {
      dLowerIdx = i;
      break;
    }
  }
  if (clampedDiameter >= FG_DIAMETER_POINTS[FG_DIAMETER_POINTS.length - 1]) {
    dLowerIdx = FG_DIAMETER_POINTS.length - 2;
  }
  
  const dLower = FG_DIAMETER_POINTS[dLowerIdx];
  const dUpper = FG_DIAMETER_POINTS[dLowerIdx + 1];
  
  // Find strength interval
  let sLowerIdx = 0;
  for (let i = 0; i < FG_STRENGTH_POINTS.length - 1; i++) {
    if (clampedStrength >= FG_STRENGTH_POINTS[i] && clampedStrength <= FG_STRENGTH_POINTS[i + 1]) {
      sLowerIdx = i;
      break;
    }
  }
  if (clampedStrength >= FG_STRENGTH_POINTS[FG_STRENGTH_POINTS.length - 1]) {
    sLowerIdx = FG_STRENGTH_POINTS.length - 2;
  }
  
  const sLower = FG_STRENGTH_POINTS[sLowerIdx];
  const sUpper = FG_STRENGTH_POINTS[sLowerIdx + 1];
  
  // Get the four corner values for bilinear interpolation
  const fg_dLower_sLower = FG_TABLE[dLower][sLowerIdx];
  const fg_dLower_sUpper = FG_TABLE[dLower][sLowerIdx + 1];
  const fg_dUpper_sLower = FG_TABLE[dUpper][sLowerIdx];
  const fg_dUpper_sUpper = FG_TABLE[dUpper][sLowerIdx + 1];
  
  // Bilinear interpolation
  // First interpolate along strength axis for both diameters
  const fg_dLower = linearInterpolate(clampedStrength, sLower, sUpper, fg_dLower_sLower, fg_dLower_sUpper);
  const fg_dUpper = linearInterpolate(clampedStrength, sLower, sUpper, fg_dUpper_sLower, fg_dUpper_sUpper);
  
  // Then interpolate along diameter axis
  const fg = linearInterpolate(clampedDiameter, dLower, dUpper, fg_dLower, fg_dUpper);
  
  return fg;
}

/**
 * Returns the Fg interpolation table for reference
 */
export function getFgCorrectionTable(): { diameters: number[]; strengths: number[]; table: Record<number, number[]> } {
  return {
    diameters: [...FG_DIAMETER_POINTS],
    strengths: [...FG_STRENGTH_POINTS],
    table: { ...FG_TABLE },
  };
}

/**
 * Calculates the L/D correction factor using linear interpolation
 * Formula from Excel: FORECAST.LINEAR between table values
 * 
 * @param ldRatio - Length to Diameter ratio (typically 1.0 to 2.0)
 * @returns Correction factor for L/D ratio
 */
export function calculateLDCorrectionFactor(ldRatio: number): number {
  // Multiply by 10 to match Excel's scale (15, 20, 25, 30, 35)
  const scaledRatio = ldRatio * 10;
  
  // Find the appropriate interval for interpolation
  if (scaledRatio <= 15) {
    return LD_CORRECTION_TABLE[0].correctionFactor; // 1.07
  }
  
  if (scaledRatio >= 35) {
    return LD_CORRECTION_TABLE[LD_CORRECTION_TABLE.length - 1].correctionFactor; // 1.02
  }
  
  // Linear interpolation between table values
  for (let i = 0; i < LD_CORRECTION_TABLE.length - 1; i++) {
    const lower = LD_CORRECTION_TABLE[i];
    const upper = LD_CORRECTION_TABLE[i + 1];
    const lowerScaled = lower.ldRatio * 10;
    const upperScaled = upper.ldRatio * 10;
    
    if (scaledRatio >= lowerScaled && scaledRatio <= upperScaled) {
      // Linear interpolation: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
      const factor = lower.correctionFactor + 
        (scaledRatio - lowerScaled) * 
        (upper.correctionFactor - lower.correctionFactor) / 
        (upperScaled - lowerScaled);
      return factor;
    }
  }
  
  return 1.0; // Default fallback
}

/**
 * Gets the moisture correction factor based on aggregate condition
 * 
 * @param condition - Aggregate moisture condition
 * @returns Moisture correction factor (Fm)
 */
export function getMoistureCorrectionFactor(condition: AggregateCondition): number {
  const entry = MOISTURE_CORRECTION_TABLE.find(m => m.condition === condition);
  return entry?.factor ?? 1.0;
}

/**
 * Calculates the reinforcement correction factor
 * Accounts for the presence of steel bars in the core sample
 * 
 * Formula from Excel:
 * 1 + 1.5 * (Σ(bar_diameter * distance_from_end)) / (diameter * length)
 * 
 * @param reinforcement - Array of reinforcement bar data
 * @param diameter - Core diameter in mm
 * @param length - Core length in mm
 * @returns Reinforcement correction factor
 */
export function calculateReinforcementCorrectionFactor(
  reinforcement: Array<{ diameterMm: number; distanceFromEndMm: number }> | undefined,
  diameter: number,
  length: number
): number {
  if (!reinforcement || reinforcement.length === 0) {
    return 1.0;
  }
  
  const sumProduct = reinforcement.reduce(
    (sum, bar) => sum + bar.diameterMm * bar.distanceFromEndMm,
    0
  );
  
  return 1 + (1.5 * sumProduct) / (diameter * length);
}

/**
 * Calculates density from weight and dimensions
 * 
 * Formula from Excel: G28 = Q11 * 1.2732 / G26 / G26 / G27 * 1000
 * Where:
 * - Q11 = Weight in grams
 * - G26 = Diameter in mm
 * - G27 = Length in mm
 * - 1.2732 ≈ 4/π (for circular cross-section)
 * 
 * Volume = π * (d/2)² * L = π * d² * L / 4
 * Density = Weight / Volume = Weight * 4 / (π * d² * L)
 * 
 * @param weightGrams - Weight in grams
 * @param diameterMm - Diameter in mm
 * @param lengthMm - Length in mm
 * @returns Density in g/cm³
 */
export function calculateDensity(weightGrams: number, diameterMm: number, lengthMm: number): number {
  // Convert mm to cm: diameter/10, length/10
  // Volume in cm³ = π * (d/10/2)² * (L/10) = π * d² * L / 4000
  // Density = weight / volume = weight * 4000 / (π * d² * L)
  // Using 1.2732 ≈ 4/π and adjusting units:
  // = weightGrams * 1.2732 / diameterMm / diameterMm / lengthMm * 1000
  const density = weightGrams * 1.2732 / diameterMm / diameterMm / lengthMm * 1000;
  return density;
}

/**
 * Converts breaking load from kN to tons
 * 
 * Formula from Excel: G29 = Q19 / 10
 * 
 * @param loadKN - Breaking load in kN
 * @returns Breaking load in tons
 */
export function convertKNtoTons(loadKN: number): number {
  return loadKN / 10;
}

/**
 * Calculates core compressive strength from breaking load
 * 
 * Formula from Excel: G31 = G29 * 1000 * 1.2732 * 100 / G26 / G26
 * Where:
 * - G29 = Breaking load in tons
 * - 1000 = Convert tons to kg
 * - 1.2732 ≈ 4/π (for circular area calculation)
 * - 100 = Unit conversion factor
 * - G26 = Diameter in mm
 * 
 * Simplified: Load(kg) / Area(cm²) = (Load_tons * 1000) / (π * (d/20)²)
 * = Load_tons * 1000 * 4 / (π * d² / 100)
 * = Load_tons * 1000 * 400 / (π * d²)
 * = Load_tons * 127323.95 / d²
 * 
 * @param breakingLoadTons - Breaking load in tons
 * @param diameterMm - Diameter in mm
 * @returns Core strength in kg/cm²
 */
export function calculateCoreStrength(breakingLoadTons: number, diameterMm: number): number {
  // Formula: (Load in tons) * 1000 * (4/π) * 100 / d² 
  // = (Load in tons) * 127323.95... / d²
  const strengthKgCm2 = breakingLoadTons * 1000 * 1.2732 * 100 / (diameterMm * diameterMm);
  return strengthKgCm2;
}

/**
 * Main calculation function for concrete core sample
 * Implements the full calculation as per the Excel spreadsheet
 * 
 * Excel Structure:
 * - G26 = AVERAGE(Q13:Q14)  -> Average diameter
 * - G27 = AVERAGE(Q15:Q17)  -> Average length
 * - G28 = Q11*1.2732/G26/G26/G27*1000  -> Calculated density from weight
 * - G29 = Q19/10  -> Convert kN to tons
 * - G31 = G29*1000*1.2732*100/G26/G26  -> Core strength
 * - G32 = IF(moisture condition)  -> Moisture factor (Fm)
 * - G33 = 1.12  -> Cutting factor (Fg)
 * - G38 = G31*G32*G33*(Q18/(1.5+G26/G27))*(1+1.5*(reinforcement_sum)/(G26*G27))
 * 
 * Note: Excel uses Q18 (user-provided density) in final formula, not G28 (calculated)
 * 
 * @param input - Core sample input data
 * @returns Calculated results including equivalent cube strength
 */
export function calculateCoreSample(input: CoreSampleInput): CoreSampleResult {
  // Calculate average diameter (G26)
  const averageDiameter = input.diameters.reduce((a, b) => a + b, 0) / input.diameters.length;
  
  // Calculate average length (G27)
  const averageLength = input.lengths.reduce((a, b) => a + b, 0) / input.lengths.length;
  
  // Calculate L/D ratio
  const ldRatio = averageLength / averageDiameter;
  
  // Convert breaking load from kN to tons (G29 = Q19/10)
  const breakingLoadTons = convertKNtoTons(input.breakingLoadKN);
  
  // Calculate density from weight if provided, otherwise use provided density (G28)
  let calculatedDensity: number;
  if (input.weightGrams) {
    calculatedDensity = calculateDensity(input.weightGrams, averageDiameter, averageLength);
  } else if (input.density) {
    calculatedDensity = input.density;
  } else {
    // Default typical concrete density
    calculatedDensity = 2.4;
  }
  
  // Density used in final formula (Q18 - user provided, or calculated)
  const densityForFormula = input.density ?? calculatedDensity;
  
  // Calculate core strength (G31) in kg/cm²
  const coreStrength = calculateCoreStrength(breakingLoadTons, averageDiameter);
  
  // Convert core strength to MPa for Fg lookup (1 kg/cm² = 0.0980665 MPa)
  const coreStrengthMPa = coreStrength * 0.0980665;
  
  // Get correction factors
  const moistureCorrectionFactor = getMoistureCorrectionFactor(input.aggregateCondition);
  
  // Calculate Fg using interpolation table based on diameter and strength
  const cuttingCorrectionFactor = calculateFgCorrectionFactor(averageDiameter, coreStrengthMPa);
  
  const ldCorrectionFactor = calculateLDCorrectionFactor(ldRatio);
  const reinforcementCorrectionFactor = calculateReinforcementCorrectionFactor(
    input.reinforcement,
    averageDiameter,
    averageLength
  );
  
  // Calculate equivalent cube strength using the Excel formula (G38)
  // G38 = G31 * G32 * G33 * (Q18 / (1.5 + G26/G27)) * reinforcement_factor
  const densityFactor = densityForFormula / (1.5 + averageDiameter / averageLength);
  
  const equivalentCubeStrength = 
    coreStrength * 
    moistureCorrectionFactor * 
    cuttingCorrectionFactor * 
    densityFactor * 
    reinforcementCorrectionFactor;
  
  // Convert to MPa (1 kg/cm² = 0.0980665 MPa)
  const equivalentCubeStrengthMPa = equivalentCubeStrength * 0.0980665;
  
  return {
    sampleNumber: input.sampleNumber,
    averageDiameter,
    averageLength,
    ldRatio,
    calculatedDensity,
    breakingLoadTons,
    coreStrength,
    moistureCorrectionFactor,
    cuttingCorrectionFactor,
    ldCorrectionFactor,
    reinforcementCorrectionFactor,
    equivalentCubeStrength,
    equivalentCubeStrengthMPa,
  };
}

/**
 * Calculates batch of core samples and provides statistical summary
 * 
 * @param samples - Array of core sample inputs
 * @returns Batch calculation results with statistics
 */
export function calculateBatch(samples: CoreSampleInput[]): BatchCalculationResult {
  const results = samples.map(calculateCoreSample);
  
  const strengths = results.map(r => r.equivalentCubeStrength);
  const n = strengths.length;
  
  const averageStrength = strengths.reduce((a, b) => a + b, 0) / n;
  const minimumStrength = Math.min(...strengths);
  const maximumStrength = Math.max(...strengths);
  
  // Calculate standard deviation
  const variance = strengths.reduce((sum, s) => sum + Math.pow(s - averageStrength, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    results,
    averageStrength,
    minimumStrength,
    maximumStrength,
    standardDeviation,
  };
}

/**
 * Returns the L/D correction factor table
 */
export function getLDCorrectionTable(): LDCorrectionTable[] {
  return [...LD_CORRECTION_TABLE];
}

/**
 * Returns the moisture correction factor table
 */
export function getMoistureCorrectionTable(): MoistureCorrectionTable[] {
  return [...MOISTURE_CORRECTION_TABLE];
}
