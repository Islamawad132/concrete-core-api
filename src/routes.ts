import { Router, Request, Response } from 'express';
import {
  calculateCoreSample,
  calculateBatch,
  getLDCorrectionTable,
  getMoistureCorrectionTable,
  calculateLDCorrectionFactor,
  getMoistureCorrectionFactor,
  calculateFgCorrectionFactor,
  getFgCorrectionTable,
} from './calculator';
import { CoreSampleInput, AggregateCondition } from './types';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AggregateCondition:
 *       type: string
 *       enum: [dry, natural, saturated]
 *       description: |
 *         Moisture condition of the concrete core aggregate (درجة رطوبة القلب)
 *         - **dry** (جافة): Air-dried cores, factor = 0.96
 *         - **natural** (طبيعية): As-received condition, factor = 1.00
 *         - **saturated** (مشبعة): Water-saturated cores, factor = 1.05
 * 
 *     ReinforcementBar:
 *       type: object
 *       required:
 *         - diameterMm
 *         - distanceFromEndMm
 *       properties:
 *         diameterMm:
 *           type: number
 *           description: Diameter of the reinforcement bar in mm (قطر حديد التسليح)
 *           example: 10
 *         distanceFromEndMm:
 *           type: number
 *           description: Distance from the nearest end of the core in mm (المسافة من أقرب نهاية)
 *           example: 50
 * 
 *     CoreSampleInput:
 *       type: object
 *       required:
 *         - diameters
 *         - lengths
 *         - breakingLoadKN
 *         - aggregateCondition
 *       properties:
 *         sampleNumber:
 *           type: string
 *           description: رقم العينة - Sample identifier
 *           example: "1"
 *         testedElement:
 *           type: string
 *           description: 1- العنصر المختبر - Structural element being tested
 *           example: "خرسانة أعمدة - مبني المدخل"
 *         visualCondition:
 *           type: string
 *           description: 2- الحالة الظاهرية للعينة - Visual condition (voids, cracks)
 *           example: "متجانسة"
 *         aggregateType:
 *           type: string
 *           enum: [gravel, crushed, lightweight]
 *           description: 3- نوع الركام - Aggregate type (زلط/دولوميت/خفيف)
 *         coringDate:
 *           type: string
 *           description: 4- تاريخ اخذ القلب - Date core was extracted
 *           example: "19/8/2025"
 *         testingDate:
 *           type: string
 *           description: 5- تاريخ إختبار القلب - Date core was tested
 *           example: "26/08/2025"
 *         curingAgeDays:
 *           type: string
 *           description: 6- عمر المعالجة بالغمر فى الماء عند الإختبار (يوم)
 *         endPreparation:
 *           type: string
 *           enum: [sulfur_capping, grinding, neoprene_pads]
 *           description: 7- طريقة إعداد نهاية العينة (تغطية بالكبريت/تسوية بالجلخ)
 *         diameters:
 *           type: array
 *           items:
 *             type: number
 *           minItems: 2
 *           maxItems: 2
 *           description: |
 *             8- القطر - Two perpendicular diameter measurements in mm.
 *             Measured at right angles to ensure accuracy.
 *           example: [93, 93]
 *         lengths:
 *           type: array
 *           items:
 *             type: number
 *           minItems: 2
 *           maxItems: 3
 *           description: |
 *             9- الطول - Length measurements in mm after capping.
 *             Typically 2-3 measurements are taken.
 *           example: [122, 120, 122]
 *         weightGrams:
 *           type: number
 *           description: |
 *             الوزن بالجرام - Weight in grams (used to calculate density).
 *             If provided, density is calculated automatically.
 *           example: 1835
 *         density:
 *           type: number
 *           description: |
 *             10- كثافة القلب الخرساني (جم/سم3) - Can be provided directly.
 *             Normal concrete: 2.3-2.5 g/cm³. Used in final strength formula.
 *           example: 2.5
 *         breakingLoadKN:
 *           type: number
 *           description: |
 *             11- حمل الكسر (kN) - Breaking load in kiloNewtons.
 *             This is the maximum load at which the core fails.
 *             Converted internally to tons (÷10).
 *           example: 68.4
 *         failurePattern:
 *           type: string
 *           description: 12- شكل الإنهيار - Failure pattern description
 *           example: "شروخ طولية"
 *         aggregateCondition:
 *           $ref: '#/components/schemas/AggregateCondition'
 *         reinforcement:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ReinforcementBar'
 *           description: |
 *             16- مقاس ومكان حديد التسليح بالعينة - Reinforcement bars in sample.
 *             If bars are present, they affect the apparent strength.
 * 
 *     CoreSampleResult:
 *       type: object
 *       description: |
 *         نتائج اختبار القلب الخرساني - Output matching Excel G column structure
 *       properties:
 *         sampleNumber:
 *           type: string
 *           description: رقم العينة - Sample identifier (echoed from input)
 *         averageDiameter:
 *           type: number
 *           description: 8- القطر المتوسط للعينة (مم) - Average diameter in mm
 *           example: 93
 *         averageLength:
 *           type: number
 *           description: 9- طول العينة بعد التغطية (مم) - Average length in mm
 *           example: 121.33
 *         ldRatio:
 *           type: number
 *           description: نسبة الطول للقطر - Length to Diameter ratio
 *           example: 1.30
 *         calculatedDensity:
 *           type: number
 *           description: |
 *             10- كثافة القلب الخرساني (جم/سم3) - Calculated from weight.
 *             Formula: weight * 1.2732 / d² / L * 1000
 *           example: 2.23
 *         breakingLoadTons:
 *           type: number
 *           description: 11- حمل الكسر للقلب الخرسانى (طن) - Breaking load converted to tons
 *           example: 6.84
 *         coreStrength:
 *           type: number
 *           description: |
 *             13- مقاومة الضغط للقلب الخرسانى (كجم/سم2).
 *             Formula: load(tons) * 1000 * 1.2732 * 100 / d²
 *           example: 100.69
 *         moistureCorrectionFactor:
 *           type: number
 *           description: 14- عامل تأثير درجة رطوبة القلب (Fm) - dry=0.96, natural=1.0, saturated=1.05
 *           example: 0.96
 *         cuttingCorrectionFactor:
 *           type: number
 *           description: 15- عامل تأثير عملية القطع (Fg) - Always 1.12
 *           example: 1.12
 *         ldCorrectionFactor:
 *           type: number
 *           description: عامل تصحيح نسبة الطول للقطر - L/D correction (for reference)
 *           example: 1.07
 *         reinforcementCorrectionFactor:
 *           type: number
 *           description: عامل تصحيح حديد التسليح - Reinforcement correction
 *           example: 1.0
 *         equivalentCubeStrength:
 *           type: number
 *           description: |
 *             **17- مقاومة الضغط المستنبطة للمكعب الخرسانى بالموقع (كجم/سم2)**
 *             Main result - Equivalent 150mm cube strength.
 *             Formula: coreStrength * Fm * Fg * (density / (1.5 + d/L)) * rebarFactor
 *           example: 119.42
 *         equivalentCubeStrengthMPa:
 *           type: number
 *           description: مقاومة الضغط المستنبطة (ميجا باسكال) - Strength in MPa (× 0.0980665)
 *           example: 11.71
 * 
 *     BatchCalculationInput:
 *       type: object
 *       required:
 *         - samples
 *       properties:
 *         samples:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CoreSampleInput'
 *           minItems: 1
 *           description: Array of core sample inputs for batch processing
 *         projectName:
 *           type: string
 *           description: Optional project name (اسم المشروع)
 *         testingDate:
 *           type: string
 *           format: date
 *           description: Optional testing date (تاريخ الاختبار)
 * 
 *     BatchCalculationResult:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CoreSampleResult'
 *         averageStrength:
 *           type: number
 *           description: Average equivalent cube strength of all samples (kg/cm²)
 *         minimumStrength:
 *           type: number
 *           description: Minimum equivalent cube strength (kg/cm²)
 *         maximumStrength:
 *           type: number
 *           description: Maximum equivalent cube strength (kg/cm²)
 *         standardDeviation:
 *           type: number
 *           description: Standard deviation of strengths (kg/cm²)
 * 
 *     LDCorrectionEntry:
 *       type: object
 *       properties:
 *         ldRatio:
 *           type: number
 *           description: Length/Diameter ratio
 *         correctionFactor:
 *           type: number
 *           description: Correction factor to apply
 * 
 *     MoistureCorrectionEntry:
 *       type: object
 *       properties:
 *         condition:
 *           type: string
 *           description: Moisture condition in English
 *         conditionArabic:
 *           type: string
 *           description: Moisture condition in Arabic (حالة الرطوبة)
 *         factor:
 *           type: number
 *           description: Correction factor
 * 
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         details:
 *           type: string
 */

/**
 * @swagger
 * /api/calculate:
 *   post:
 *     summary: Calculate single core sample strength
 *     description: |
 *       Calculates the equivalent cube strength for a single concrete core sample.
 *       
 *       ## حساب مقاومة الضغط للقلب الخرساني الواحد
 *       
 *       This endpoint takes the measurements from a single core sample and returns:
 *       - Core compressive strength (مقاومة الضغط للقلب)
 *       - All correction factors applied
 *       - **Equivalent cube strength** (مقاومة الضغط المستنبطة للمكعب)
 *       
 *       ### Calculation Steps:
 *       1. Calculate average diameter from 2 measurements
 *       2. Calculate average length from 2-3 measurements
 *       3. Compute L/D ratio
 *       4. Calculate core strength from breaking load
 *       5. Apply all correction factors
 *       6. Compute equivalent 150mm cube strength
 *     tags: [Calculations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CoreSampleInput'
 *           examples:
 *             sample1:
 *               summary: Sample 1 from Excel (خرسانة أعمدة - مبني المدخل)
 *               value:
 *                 sampleNumber: 1
 *                 testedElement: "خرسانة أعمدة - مبني المدخل والمصافي"
 *                 aggregateType: "gravel"
 *                 coringDate: "19/8/2025"
 *                 testingDate: "26/08/2025"
 *                 endPreparation: "sulfur_capping"
 *                 diameters: [93, 93]
 *                 lengths: [122, 120, 122]
 *                 weightGrams: 1835
 *                 density: 2.5
 *                 breakingLoadKN: 68.4
 *                 aggregateCondition: "dry"
 *             sample2:
 *               summary: Sample 2 from Excel (minimal input)
 *               value:
 *                 diameters: [93, 93]
 *                 lengths: [116, 116, 115]
 *                 density: 2.5
 *                 breakingLoadKN: 63.6
 *                 aggregateCondition: "dry"
 *             withReinforcement:
 *               summary: Sample with reinforcement bars
 *               value:
 *                 diameters: [100, 100]
 *                 lengths: [200, 198]
 *                 weightGrams: 3700
 *                 density: 2.4
 *                 breakingLoadKN: 85
 *                 aggregateCondition: "natural"
 *                 reinforcement:
 *                   - diameterMm: 10
 *                     distanceFromEndMm: 50
 *     responses:
 *       200:
 *         description: Successful calculation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoreSampleResult'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/calculate', (req: Request, res: Response) => {
  try {
    const input = validateCoreSampleInput(req.body);
    const result = calculateCoreSample(input);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: 'Invalid input',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/calculate/batch:
 *   post:
 *     summary: Calculate multiple core samples with statistics
 *     description: |
 *       Calculates equivalent cube strength for multiple core samples and provides
 *       statistical summary including average, min, max, and standard deviation.
 *       
 *       ## حساب مجموعة من عينات القلب الخرساني
 *       
 *       Useful for evaluating concrete quality across multiple samples from the same
 *       structural element or project.
 *       
 *       ### Statistical Analysis:
 *       - **Average strength**: Mean of all equivalent cube strengths
 *       - **Minimum strength**: Lowest strength value
 *       - **Maximum strength**: Highest strength value
 *       - **Standard deviation**: Measure of strength variability
 *     tags: [Calculations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchCalculationInput'
 *           example:
 *             projectName: "مبني المدخل والمخازن"
 *             testingDate: "26/08/2025"
 *             samples:
 *               - sampleNumber: 1
 *                 testedElement: "خرسانة أعمدة - مبني المدخل والمصافي"
 *                 diameters: [93, 93]
 *                 lengths: [122, 120, 122]
 *                 weightGrams: 1835
 *                 density: 2.5
 *                 breakingLoadKN: 68.4
 *                 aggregateCondition: "dry"
 *               - sampleNumber: 2
 *                 diameters: [93, 93]
 *                 lengths: [116, 116, 115]
 *                 weightGrams: 1770
 *                 density: 2.5
 *                 breakingLoadKN: 63.6
 *                 aggregateCondition: "dry"
 *                 reinforcement:
 *                   - diameterMm: 8
 *                     distanceFromEndMm: 43
 *               - sampleNumber: 3
 *                 diameters: [93, 93]
 *                 lengths: [112, 114, 113]
 *                 weightGrams: 1433
 *                 density: 2.5
 *                 breakingLoadKN: 32.8
 *                 aggregateCondition: "dry"
 *     responses:
 *       200:
 *         description: Successful batch calculation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BatchCalculationResult'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/calculate/batch', (req: Request, res: Response) => {
  try {
    const { samples } = req.body;
    if (!Array.isArray(samples) || samples.length === 0) {
      throw new Error('samples array is required and must not be empty');
    }
    const validatedSamples = samples.map(validateCoreSampleInput);
    const result = calculateBatch(validatedSamples);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: 'Invalid input',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/reference/ld-correction:
 *   get:
 *     summary: Get L/D ratio correction factor table
 *     description: |
 *       Returns the Length/Diameter ratio correction factor table.
 *       
 *       ## جدول معاملات تصحيح نسبة الطول للقطر
 *       
 *       When the L/D ratio is less than 2.0, the apparent strength is higher
 *       than the true strength. This table provides correction factors based
 *       on BS 1881 and ASTM C42 standards.
 *       
 *       For L/D ratios between table values, linear interpolation is used.
 *     tags: [Reference]
 *     responses:
 *       200:
 *         description: L/D correction factor table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LDCorrectionEntry'
 */
router.get('/reference/ld-correction', (_req: Request, res: Response) => {
  res.json(getLDCorrectionTable());
});

/**
 * @swagger
 * /api/reference/moisture-correction:
 *   get:
 *     summary: Get moisture correction factor table
 *     description: |
 *       Returns the moisture condition correction factor table.
 *       
 *       ## جدول معاملات تصحيح درجة الرطوبة
 *       
 *       The moisture condition of the core at the time of testing affects
 *       the measured strength:
 *       
 *       - **Dry cores** (جافة): Give higher apparent strength → multiply by 0.96
 *       - **Natural condition** (طبيعية): No correction needed → multiply by 1.00
 *       - **Saturated cores** (مشبعة): Give lower apparent strength → multiply by 1.05
 *     tags: [Reference]
 *     responses:
 *       200:
 *         description: Moisture correction factor table
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MoistureCorrectionEntry'
 */
router.get('/reference/moisture-correction', (_req: Request, res: Response) => {
  res.json(getMoistureCorrectionTable());
});

/**
 * @swagger
 * /api/reference/ld-factor/{ldRatio}:
 *   get:
 *     summary: Calculate L/D correction factor for specific ratio
 *     description: |
 *       Calculates the L/D correction factor for a specific Length/Diameter ratio
 *       using linear interpolation between table values.
 *       
 *       ## حساب معامل تصحيح نسبة الطول للقطر
 *     tags: [Reference]
 *     parameters:
 *       - in: path
 *         name: ldRatio
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 1.0
 *           maximum: 3.5
 *         description: Length/Diameter ratio (نسبة الطول للقطر)
 *         example: 1.3
 *     responses:
 *       200:
 *         description: Calculated correction factor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ldRatio:
 *                   type: number
 *                 correctionFactor:
 *                   type: number
 *       400:
 *         description: Invalid L/D ratio
 */
router.get('/reference/ld-factor/:ldRatio', (req: Request, res: Response) => {
  const ldRatio = parseFloat(req.params.ldRatio);
  if (isNaN(ldRatio) || ldRatio < 0) {
    return res.status(400).json({ error: 'Invalid L/D ratio' });
  }
  res.json({
    ldRatio,
    correctionFactor: calculateLDCorrectionFactor(ldRatio),
  });
});

/**
 * @swagger
 * /api/reference/moisture-factor/{condition}:
 *   get:
 *     summary: Get moisture correction factor for specific condition
 *     description: |
 *       Returns the moisture correction factor for a specific aggregate condition.
 *       
 *       ## الحصول على معامل تصحيح الرطوبة
 *     tags: [Reference]
 *     parameters:
 *       - in: path
 *         name: condition
 *         required: true
 *         schema:
 *           type: string
 *           enum: [dry, natural, saturated]
 *         description: Aggregate moisture condition (حالة رطوبة الركام)
 *     responses:
 *       200:
 *         description: Correction factor for the condition
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 condition:
 *                   type: string
 *                 factor:
 *                   type: number
 *       400:
 *         description: Invalid condition
 */
router.get('/reference/moisture-factor/:condition', (req: Request, res: Response) => {
  const condition = req.params.condition as AggregateCondition;
  const validConditions: AggregateCondition[] = ['dry', 'natural', 'saturated'];
  
  if (!validConditions.includes(condition)) {
    return res.status(400).json({
      error: 'Invalid condition',
      validConditions,
    });
  }
  
  res.json({
    condition,
    factor: getMoistureCorrectionFactor(condition),
  });
});

/**
 * @swagger
 * /api/reference/fg-correction:
 *   get:
 *     summary: Get Fg (cutting correction factor) interpolation table
 *     description: |
 *       Returns the complete Fg interpolation table.
 *       
 *       ## جدول معاملات تصحيح القطع (Fg)
 *       
 *       Fg depends on TWO factors:
 *       - **Core Diameter** (50, 75, 100, 125, 150 mm)
 *       - **Core Strength** (15, 20, 25, 30, 35 N/mm² = MPa)
 *       
 *       The API automatically calculates Fg using bilinear interpolation.
 *       For strengths < 15 MPa, the 15 MPa value is used.
 *     tags: [Reference]
 *     responses:
 *       200:
 *         description: Fg interpolation table
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 diameters:
 *                   type: array
 *                   items:
 *                     type: number
 *                   description: Available core diameters (mm)
 *                 strengths:
 *                   type: array
 *                   items:
 *                     type: number
 *                   description: Strength points (MPa)
 *                 table:
 *                   type: object
 *                   description: Fg values indexed by diameter
 */
router.get('/reference/fg-correction', (_req: Request, res: Response) => {
  res.json(getFgCorrectionTable());
});

/**
 * @swagger
 * /api/reference/fg-factor/{diameter}/{strength}:
 *   get:
 *     summary: Calculate Fg for specific diameter and strength
 *     description: |
 *       Calculates the Fg (cutting correction factor) for a specific
 *       core diameter and core strength using bilinear interpolation.
 *       
 *       ## حساب معامل تصحيح القطع
 *     tags: [Reference]
 *     parameters:
 *       - in: path
 *         name: diameter
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 50
 *           maximum: 150
 *         description: Core diameter in mm (القطر)
 *         example: 93
 *       - in: path
 *         name: strength
 *         required: true
 *         schema:
 *           type: number
 *         description: Core strength in MPa (مقاومة الضغط)
 *         example: 10
 *     responses:
 *       200:
 *         description: Calculated Fg factor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 diameter:
 *                   type: number
 *                 strengthMPa:
 *                   type: number
 *                 fg:
 *                   type: number
 *       400:
 *         description: Invalid parameters
 */
router.get('/reference/fg-factor/:diameter/:strength', (req: Request, res: Response) => {
  const diameter = parseFloat(req.params.diameter);
  const strength = parseFloat(req.params.strength);
  
  if (isNaN(diameter) || diameter <= 0) {
    return res.status(400).json({ error: 'Invalid diameter' });
  }
  if (isNaN(strength) || strength < 0) {
    return res.status(400).json({ error: 'Invalid strength' });
  }
  
  res.json({
    diameter,
    strengthMPa: strength,
    fg: calculateFgCorrectionFactor(diameter, strength),
  });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns API health status
 *     tags: [Reference]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

function validateCoreSampleInput(input: unknown): CoreSampleInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be an object');
  }

  const data = input as Record<string, unknown>;

  if (!Array.isArray(data.diameters) || data.diameters.length !== 2) {
    throw new Error('diameters must be an array of exactly 2 numbers');
  }
  if (!data.diameters.every((d: unknown) => typeof d === 'number' && d > 0)) {
    throw new Error('All diameter values must be positive numbers');
  }

  if (!Array.isArray(data.lengths) || data.lengths.length < 2 || data.lengths.length > 3) {
    throw new Error('lengths must be an array of 2-3 numbers');
  }
  if (!data.lengths.every((l: unknown) => typeof l === 'number' && l > 0)) {
    throw new Error('All length values must be positive numbers');
  }

  // breakingLoadKN is required (in kN, as per Excel Q19)
  if (typeof data.breakingLoadKN !== 'number' || data.breakingLoadKN <= 0) {
    throw new Error('breakingLoadKN must be a positive number (load in kN)');
  }

  // density is optional but if provided must be positive
  if (data.density !== undefined && (typeof data.density !== 'number' || data.density <= 0)) {
    throw new Error('density must be a positive number if provided');
  }

  // weightGrams is optional but if provided must be positive
  if (data.weightGrams !== undefined && (typeof data.weightGrams !== 'number' || data.weightGrams <= 0)) {
    throw new Error('weightGrams must be a positive number if provided');
  }

  // Either density or weightGrams should be provided
  if (data.density === undefined && data.weightGrams === undefined) {
    throw new Error('Either density or weightGrams must be provided');
  }

  const validConditions: AggregateCondition[] = ['dry', 'natural', 'saturated'];
  if (!validConditions.includes(data.aggregateCondition as AggregateCondition)) {
    throw new Error(`aggregateCondition must be one of: ${validConditions.join(', ')}`);
  }

  if (data.reinforcement !== undefined) {
    if (!Array.isArray(data.reinforcement)) {
      throw new Error('reinforcement must be an array');
    }
    for (const bar of data.reinforcement) {
      if (typeof bar !== 'object' || bar === null) {
        throw new Error('Each reinforcement entry must be an object');
      }
      const barData = bar as Record<string, unknown>;
      if (typeof barData.diameterMm !== 'number' || barData.diameterMm <= 0) {
        throw new Error('reinforcement diameterMm must be a positive number');
      }
      if (typeof barData.distanceFromEndMm !== 'number' || barData.distanceFromEndMm < 0) {
        throw new Error('reinforcement distanceFromEndMm must be a non-negative number');
      }
    }
  }

  return {
    sampleNumber: data.sampleNumber as string | number | undefined,
    testedElement: data.testedElement as string | undefined,
    visualCondition: data.visualCondition as string | undefined,
    aggregateType: data.aggregateType as CoreSampleInput['aggregateType'],
    coringDate: data.coringDate as string | undefined,
    testingDate: data.testingDate as string | undefined,
    curingAgeDays: data.curingAgeDays as number | string | undefined,
    endPreparation: data.endPreparation as CoreSampleInput['endPreparation'],
    diameters: data.diameters as [number, number],
    lengths: data.lengths as number[],
    weightGrams: data.weightGrams as number | undefined,
    density: data.density as number | undefined,
    breakingLoadKN: data.breakingLoadKN as number,
    failurePattern: data.failurePattern as string | undefined,
    aggregateCondition: data.aggregateCondition as AggregateCondition,
    reinforcement: data.reinforcement as CoreSampleInput['reinforcement'],
  };
}

export default router;
