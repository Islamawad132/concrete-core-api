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
  PullOffSampleInput,
  PullOffSampleResult,
  PullOffBatchResult,
  PullOffUncertainty,
  SchmidtHammerElementInput,
  SchmidtHammerElementResult,
  SchmidtHammerBatchInput,
  SchmidtHammerBatchResult,
  SchmidtHammerUncertainty,
  SchmidtHammerAnvilInput,
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
 * Rounds to the nearest standard core diameter for Fg lookup
 * Standard diameters: 50, 75, 100, 125, 150 mm
 * This matches Excel behavior which uses "قطر العينة الاسمى" (nominal diameter)
 */
function roundToNearestStandardDiameter(diameterMm: number): number {
  const standardDiameters = [50, 75, 100, 125, 150];
  let nearest = standardDiameters[0];
  let minDiff = Math.abs(diameterMm - nearest);

  for (const std of standardDiameters) {
    const diff = Math.abs(diameterMm - std);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = std;
    }
  }
  return nearest;
}

/**
 * Calculates Fg (cutting correction factor) using bilinear interpolation
 * Based on core diameter and core strength
 *
 * Note: Uses nearest standard diameter (50, 75, 100, 125, 150) for lookup
 * to match Excel behavior with "قطر العينة الاسمى" (nominal diameter)
 *
 * @param diameterMm - Core diameter in mm (will be rounded to nearest standard)
 * @param strengthMPa - Core strength in MPa (N/mm²)
 * @returns Fg correction factor
 */
export function calculateFgCorrectionFactor(diameterMm: number, strengthMPa: number): number {
  // Clamp strength to table range (use 15 for anything below)
  const clampedStrength = Math.max(15, Math.min(35, strengthMPa));

  // Round to nearest standard diameter (matches Excel nominal diameter approach)
  const clampedDiameter = roundToNearestStandardDiameter(diameterMm);
  
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

  // Calculate density from weight for display (G29 - not used in formula)
  let calculatedDensity: number;
  if (input.weightGrams) {
    calculatedDensity = calculateDensity(input.weightGrams, averageDiameter, averageLength);
  } else {
    // Default typical concrete density for display
    calculatedDensity = 2.4;
  }

  // Direction factor (معامل اتجاه أخذ العينة) - user input, used in final formula
  // Typical values: 2.5 (horizontal coring), 2.3 (vertical coring)
  const directionFactor = input.directionFactor;
  
  // Calculate core strength (G31) in kg/cm²
  const coreStrength = calculateCoreStrength(breakingLoadTons, averageDiameter);
  
  // Convert core strength to MPa for Fg lookup
  // Note: Excel uses simple division by 10 (G32/10), not exact factor
  // Using same approach to match Excel: kg/cm² ÷ 10 ≈ MPa
  const coreStrengthMPa = coreStrength / 10;
  
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
  
  // Calculate equivalent cube strength using the Excel formula (G39)
  // G39 = G32 * G33 * G34 * (Q19 / (1.5 + G27/G28)) * reinforcement_factor
  // Where Q19 = معامل اتجاه أخذ العينة (direction factor, typically 2.5)
  const directionFactorComponent = directionFactor / (1.5 + averageDiameter / averageLength);
  
  const equivalentCubeStrength =
    coreStrength *
    moistureCorrectionFactor *
    cuttingCorrectionFactor *
    directionFactorComponent *
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

// =====================================================
// Pull-Off Test Calculator (اختبار الإقتلاع)
// Based on BS 1881-Part 207-1992
// =====================================================

/**
 * Calculates the circular area from diameter
 * المساحة = π × (القطر/2)²
 *
 * @param diameterMm - Diameter in mm
 * @returns Area in mm²
 */
export function calculateCircularArea(diameterMm: number): number {
  const radius = diameterMm / 2;
  return Math.PI * radius * radius;
}

/**
 * Calculates tensile adhesion strength (Pull-Off stress)
 *
 * Formula: Stress (MPa) = Load (N) / Area (mm²)
 * Or equivalently: Stress = 4 × Load / (π × D²)
 *
 * From Excel verification:
 * Sample 1: D=55mm, Load=3.63KN=3630N
 * Area = π × (55/2)² = 2375.83 mm²
 * Stress = 3630 / 2375.83 = 1.528 MPa ✓
 *
 * @param loadN - Failure load in Newtons
 * @param diameterMm - Specimen diameter in mm
 * @returns Tensile adhesion strength in MPa (N/mm²)
 */
export function calculateTensileStrength(loadN: number, diameterMm: number): number {
  const area = calculateCircularArea(diameterMm);
  return loadN / area;
}

/**
 * Calculates a single Pull-Off test specimen result
 *
 * @param input - Pull-Off sample input data
 * @returns Pull-Off sample result
 */
export function calculatePullOffSample(input: PullOffSampleInput): PullOffSampleResult {
  // Convert kN to N
  const failureLoadN = input.failureLoadKN * 1000;

  // Calculate area
  const areaMm2 = calculateCircularArea(input.diameterMm);

  // Calculate tensile adhesion strength
  const tensileStrengthMPa = calculateTensileStrength(failureLoadN, input.diameterMm);

  return {
    specimenNumber: input.specimenNumber,
    specimenCode: input.specimenCode,
    testedItem: input.testedItem,
    diameterMm: input.diameterMm,
    failureMode: input.failureMode,
    failureLoadKN: input.failureLoadKN,
    failureLoadN,
    areaMm2,
    tensileStrengthMPa,
  };
}

/**
 * Calculates standard deviation of an array of numbers
 *
 * @param values - Array of numbers
 * @returns Standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1); // Sample variance
  return Math.sqrt(variance);
}

/**
 * Calculates uncertainty for Pull-Off test
 * Based on the Excel calculations in the "SHEET" tab
 * Matches Excel output: UA=0.174, UB=0.026, Ucomp=0.176, Expanded=0.352 MPa
 *
 * @param results - Array of sample results
 * @param diameters - Array of all diameter measurements
 * @param loads - Array of all load measurements in N
 * @returns Uncertainty components
 */
export function calculatePullOffUncertainty(
  results: PullOffSampleResult[],
  diameters: number[],
  loads: number[]
): PullOffUncertainty {
  const n = results.length;

  // Calculate statistics
  const strengths = results.map(r => r.tensileStrengthMPa);
  const averageStrength = strengths.reduce((a, b) => a + b, 0) / n;
  const averageDiameter = diameters.reduce((a, b) => a + b, 0) / diameters.length;
  const averageLoad = loads.reduce((a, b) => a + b, 0) / loads.length;

  const diameterSD = calculateStandardDeviation(diameters);
  const loadSD = calculateStandardDeviation(loads);

  // From Excel SHEET tab:
  // Favg (Mpa) = 4Pavg / A = 1.5772913357235356
  //
  // Sensitivity coefficients from Excel:
  // CP = 0.0004351194020674881 (∂σ/∂P)
  // CD = -0.05827515936472429 (∂σ/∂D)
  const area = calculateCircularArea(averageDiameter);
  const Cp = 4 / (Math.PI * averageDiameter * averageDiameter); // = 1/Area in mm²
  const CD = -2 * averageStrength / averageDiameter;

  // From Excel uncertainty table:
  // Load uncertainties (in N):
  // Excel uses SD/sqrt(3) for repeatability uncertainty
  const uncertaintyRepeatabilityLoad = loadSD / Math.sqrt(3); // URep = SD/√3 = 360.38 N
  const uncertaintyCalibrationLoad = 104.5 / 2; // Ucal = 104.5/2 = 52.25 N
  const uncertaintyResolutionLoad = 50 / Math.sqrt(3); // URes = 50/√3 = 28.87 N

  // Diameter uncertainties (in mm):
  // Excel uses SD/sqrt(3) for repeatability uncertainty
  const uncertaintyRepeatabilityDiameter = diameterSD / Math.sqrt(3); // URep = SD/√3 = 1.296 mm
  const uncertaintyCalibrationDiameter = 0.007378583333333333 / 2; // Ucal/2
  const uncertaintyResolutionDiameter = 0.01 / Math.sqrt(3); // 0.01/√3

  // Calculate (Ui × Ci)² for each source
  // Load contributions to uncertainty in stress
  const uLoadRep_contrib = uncertaintyRepeatabilityLoad * Cp;
  const uLoadCal_contrib = uncertaintyCalibrationLoad * Cp;
  const uLoadRes_contrib = uncertaintyResolutionLoad * Cp;

  // Diameter contributions
  const uDiamRep_contrib = uncertaintyRepeatabilityDiameter * Math.abs(CD);
  const uDiamCal_contrib = uncertaintyCalibrationDiameter * Math.abs(CD);
  const uDiamRes_contrib = uncertaintyResolutionDiameter * Math.abs(CD);

  // Type A uncertainty (from repeatability of measurements)
  // UA² = (uLoadRep × Cp)² + (uDiamRep × |CD|)²
  const uncertaintyTypeA = Math.sqrt(
    Math.pow(uLoadRep_contrib, 2) + Math.pow(uDiamRep_contrib, 2)
  );

  // Type B uncertainty (from calibration and resolution)
  const uncertaintyTypeB = Math.sqrt(
    Math.pow(uLoadCal_contrib, 2) + Math.pow(uLoadRes_contrib, 2) +
    Math.pow(uDiamCal_contrib, 2) + Math.pow(uDiamRes_contrib, 2)
  );

  // Combined standard uncertainty
  const combinedUncertainty = Math.sqrt(
    Math.pow(uncertaintyTypeA, 2) + Math.pow(uncertaintyTypeB, 2)
  );

  // Expanded uncertainty at 95% confidence (k = 2)
  const expandedUncertainty = 2 * combinedUncertainty;

  return {
    diameterSD,
    averageDiameter,
    loadSD,
    averageLoad,
    averageStrength,
    uncertaintyRepeatabilityDiameter,
    uncertaintyCalibrationDiameter,
    uncertaintyResolutionDiameter,
    uncertaintyRepeatabilityLoad,
    uncertaintyCalibrationLoad,
    uncertaintyResolutionLoad,
    uncertaintyTypeA,
    uncertaintyTypeB,
    combinedUncertainty,
    expandedUncertainty,
  };
}

/**
 * Calculates batch of Pull-Off test specimens with statistics
 * Matches Excel calculations exactly
 *
 * @param specimens - Array of Pull-Off sample inputs
 * @returns Batch calculation results with statistics and uncertainty
 */
export function calculatePullOffBatch(specimens: PullOffSampleInput[]): PullOffBatchResult {
  // Calculate individual results
  const results = specimens.map(calculatePullOffSample);

  // Extract values for statistics
  const strengths = results.map(r => r.tensileStrengthMPa);
  const diameters = specimens.map(s => s.diameterMm);
  const loadsKN = specimens.map(s => s.failureLoadKN);
  const loadsN = specimens.map(s => s.failureLoadKN * 1000);

  const n = strengths.length;

  // Calculate statistics
  const averageStrength = strengths.reduce((a, b) => a + b, 0) / n;
  const minimumStrength = Math.min(...strengths);
  const maximumStrength = Math.max(...strengths);

  // Average load in KN (متوسط الحمل)
  const averageLoadKN = loadsKN.reduce((a, b) => a + b, 0) / n;

  // Standard deviation of LOADS (not strengths) - this matches Excel
  const loadSD = calculateStandardDeviation(loadsKN);

  // Coefficient of variation from LOADS (%) - Excel formula: SD(loads) / AVG(loads) * 100
  // This gives 17.23% matching Excel exactly
  const coefficientOfVariation = (loadSD / averageLoadKN) * 100;

  // Standard deviation of strengths (for reference)
  const standardDeviation = calculateStandardDeviation(strengths);

  // Calculate uncertainty
  const uncertainty = calculatePullOffUncertainty(results, diameters, loadsN);

  return {
    results,
    averageStrength,
    averageLoadKN,
    minimumStrength,
    maximumStrength,
    standardDeviation,
    coefficientOfVariation,
    uncertainty,
    expandedUncertaintyMPa: uncertainty.expandedUncertainty,
  };
}

// =====================================================
// Schmidt Hammer Test Calculator (اختبار مطرقة الإرتداد)
// Based on EN 12504-2-2021
// =====================================================

/**
 * Degrees of freedom table for t-distribution (k factor at 95% confidence)
 * Used for expanded uncertainty calculation
 */
const DOF_K_TABLE: Record<number, number> = {
  1: 13.97,
  2: 4.53,
  3: 3.31,
  4: 2.87,
  5: 2.65,
  6: 2.52,
  7: 2.43,
  8: 2.37,
  12: 2.23,
  14: 2.2,
  16: 2.17,
  18: 2.5,
  20: 2.13,
  25: 2.11,
  30: 2.09,
  35: 2.07,
  40: 2.06,
  45: 2.06,
  50: 2.05,
  60: 2.04,
  80: 2.03,
  100: 2.02,
  Infinity: 2,
};

/**
 * Gets the k factor (coverage factor) based on degrees of freedom
 * Used for expanded uncertainty at 95% confidence level
 *
 * @param dof - Degrees of freedom
 * @returns Coverage factor k
 */
function getKFactor(dof: number): number {
  // Get numeric keys and sort them
  const numericDofs = Object.keys(DOF_K_TABLE)
    .filter(k => k !== 'Infinity')
    .map(k => parseInt(k))
    .sort((a, b) => a - b);

  // Find the largest DOF that is <= the given dof
  for (let i = numericDofs.length - 1; i >= 0; i--) {
    if (dof >= numericDofs[i]) {
      return DOF_K_TABLE[numericDofs[i]];
    }
  }

  return 2; // Default k=2 for large DOF (Infinity)
}

/**
 * Calculates median of an array of numbers
 *
 * @param values - Array of numbers
 * @returns Median value (rounded to integer as per Excel)
 */
function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculates the RSA (Rebound Surface Anvil) correction factor
 * RSA = 80 / Median(anvil readings)
 *
 * From Excel Anvil sheet: G5 = 80/D5
 * where D5 = MEDIAN(all anvil readings before and after)
 *
 * @param anvilInput - Anvil calibration readings
 * @returns RSA correction factor
 */
export function calculateAnvilCorrectionFactor(anvilInput: SchmidtHammerAnvilInput): { rsa: number; median: number } {
  // Combine all anvil readings (before and after)
  const allReadings = [...anvilInput.readingsBefore, ...anvilInput.readingsAfter];

  // Calculate median
  const median = calculateMedian(allReadings);

  // RSA = 80 / Median
  const rsa = 80 / median;

  return { rsa, median };
}

/**
 * Calculates uncertainty for a single Schmidt Hammer test element
 * Based on Excel sheets 1-6 calculations
 *
 * Uncertainty components:
 * 1. Repeatability uncertainty: URP = sqrt(SD² / n)
 * 2. Resolution uncertainty: U = (resolution/2) / sqrt(3) = 1 / sqrt(3)
 * 3. Calibration uncertainty: 0.0266 / 2
 *
 * @param correctedReadings - Array of RSA-corrected readings
 * @returns Uncertainty components
 */
export function calculateSchmidtHammerUncertainty(correctedReadings: number[]): SchmidtHammerUncertainty {
  const n = correctedReadings.length; // Should be 15

  // Calculate standard deviation of corrected readings
  const mean = correctedReadings.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = correctedReadings.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
  const sd = Math.sqrt(variance);

  // Repeatability uncertainty: URP = sqrt(SD² / n)
  // From Excel: I5 = (H5^2/(15))^0.5, K5 = I5/1 (divisor=1), M5 = K5^2 * L5^2 (Ci=1)
  const repeatabilityUncertainty = Math.sqrt(Math.pow(sd, 2) / n);

  // Resolution uncertainty: resolution = 2, so half = 1
  // U = 1 / sqrt(3)
  // From Excel: B28 = 2/2 = 1, K28 = 1/sqrt(3), M28 = K28^2 * 1^2
  const resolutionUncertainty = 1 / Math.sqrt(3);

  // Calibration uncertainty: 0.0266 / 2
  // From Excel: B38 = 0.0266, K38 = 0.0266/2
  const calibrationUncertainty = 0.0266 / 2;

  // Combined uncertainty squared
  // M45 = M5 + M28 + M38
  const combinedUncertaintySquared =
    Math.pow(repeatabilityUncertainty, 2) +
    Math.pow(resolutionUncertainty, 2) +
    Math.pow(calibrationUncertainty, 2);

  const combinedUncertainty = Math.sqrt(combinedUncertaintySquared);

  // Degrees of freedom calculation (Welch-Satterthwaite)
  // From Excel: I46 = ROUND(M46^4/((N5^4)/14),0)
  // where N5 = sqrt(M5) = repeatability uncertainty
  const effectiveDof = Math.pow(combinedUncertainty, 4) /
    (Math.pow(repeatabilityUncertainty, 4) / (n - 1));
  const dof = Math.round(effectiveDof);

  // Get k factor from table
  // For more than 2 points, Excel uses k=2
  const coverageFactor = 2; // As specified in Excel: "For more than two points take K=2"

  // Expanded uncertainty = k × UComp
  const expandedUncertainty = coverageFactor * combinedUncertainty;

  return {
    repeatabilityUncertainty,
    resolutionUncertainty,
    calibrationUncertainty,
    combinedUncertainty,
    coverageFactor,
    expandedUncertainty,
  };
}

/**
 * Calculates a single Schmidt Hammer test element result
 *
 * @param element - Element input data
 * @param rsa - RSA correction factor from anvil calibration
 * @returns Element result
 */
export function calculateSchmidtHammerElement(
  element: SchmidtHammerElementInput,
  rsa: number
): SchmidtHammerElementResult {
  // Apply RSA correction to all readings
  const correctedReadings = element.readings.map(r => r * rsa);

  // Calculate median of corrected readings (rounded to integer as per Excel)
  const medianRebound = Math.round(calculateMedian(correctedReadings));

  // Calculate acceptance limits
  const lowerLimit = medianRebound * 0.75;
  const upperLimit = medianRebound * 1.25;

  // Count valid readings within acceptance limits
  const validReadingsCount = correctedReadings.filter(
    r => r >= lowerLimit && r <= upperLimit
  ).length;

  // Calculate standard deviation
  const n = correctedReadings.length;
  const mean = correctedReadings.reduce((a, b) => a + b, 0) / n;
  const squaredDiffs = correctedReadings.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1);
  const standardDeviation = Math.sqrt(variance);

  // Calculate uncertainty
  const uncertainty = calculateSchmidtHammerUncertainty(correctedReadings);

  // Approximate compressive strength (indicative only)
  // This is a rough estimation - actual strength depends on many factors
  // Using a simplified correlation: ~10-12 × median rebound for normal concrete
  // Note: According to ECP 203-2020, this is only indicative and should not be used
  // as the actual strength without correlation with core tests
  const approximateStrengthKgCm2 = medianRebound * 11.5; // Rough estimate

  return {
    elementName: element.elementName,
    elementCode: element.elementCode,
    hammerDirection: element.hammerDirection,
    originalReadings: element.readings,
    correctedReadings,
    medianRebound,
    lowerLimit,
    upperLimit,
    validReadingsCount,
    standardDeviation,
    uncertainty,
    expandedUncertainty: uncertainty.expandedUncertainty,
    approximateStrengthKgCm2,
    notes: element.notes,
  };
}

/**
 * Calculates batch of Schmidt Hammer test elements
 *
 * @param input - Batch input with elements and anvil calibration
 * @returns Batch calculation results
 */
export function calculateSchmidtHammerBatch(input: SchmidtHammerBatchInput): SchmidtHammerBatchResult {
  // Calculate RSA correction factor from anvil readings
  const { rsa, median: anvilMedian } = calculateAnvilCorrectionFactor(input.anvilCalibration);

  // Calculate results for each element
  const results = input.elements.map(element =>
    calculateSchmidtHammerElement(element, rsa)
  );

  return {
    results,
    correctionFactorRSA: rsa,
    anvilMedian,
    hammerCode: input.hammerCode,
    testingDate: input.testingDate,
  };
}
