import { Router, Request, Response } from 'express';
import {
  calculateBatch,
  calculatePullOffBatch,
} from './calculator';
import { CoreSampleInput, AggregateCondition, PullOffSampleInput } from './types';

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
 *         - directionFactor
 *       properties:
 *         sampleNumber:
 *           type: string
 *           description: |
 *             رقم العينة - Sample identifier
 *             ⚪ **اختياري (Optional)**
 *           example: "1"
 *         testedElement:
 *           type: string
 *           description: |
 *             1- العنصر المختبر - Structural element being tested
 *             ⚪ **اختياري (Optional)**
 *           example: "خرسانة أعمدة - مبني المدخل"
 *         visualCondition:
 *           type: string
 *           description: |
 *             2- الحالة الظاهرية للعينة - Visual condition (voids, cracks)
 *             ⚪ **اختياري (Optional)**
 *           example: "متجانسة ويوجد بها فراغات صغيرة"
 *         aggregateType:
 *           type: string
 *           enum: [gravel, crushed, lightweight]
 *           description: |
 *             3- نوع الركام - Aggregate type
 *             ⚪ **اختياري (Optional)**
 *             - gravel: زلط
 *             - crushed: دولوميت / كسر أحجار
 *             - lightweight: خفيف
 *         coringDate:
 *           type: string
 *           description: |
 *             4- تاريخ اخذ القلب - Date core was extracted
 *             ⚪ **اختياري (Optional)**
 *           example: "19/8/2025"
 *         testingDate:
 *           type: string
 *           description: |
 *             5- تاريخ إختبار القلب - Date core was tested
 *             ⚪ **اختياري (Optional)**
 *           example: "26/08/2025"
 *         curingAgeDays:
 *           type: string
 *           description: |
 *             6- عمر المعالجة بالغمر فى الماء عند الإختبار (يوم)
 *             ⚪ **اختياري (Optional)**
 *           example: "2"
 *         endPreparation:
 *           type: string
 *           enum: [sulfur_capping, grinding, neoprene_pads]
 *           description: |
 *             7- طريقة إعداد نهاية العينة
 *             ⚪ **اختياري (Optional)**
 *             - sulfur_capping: تغطية بالكبريت
 *             - grinding: تسوية بالجلخ
 *             - neoprene_pads: وسائد نيوبرين
 *         diameters:
 *           type: array
 *           items:
 *             type: number
 *           minItems: 2
 *           maxItems: 2
 *           description: |
 *             8- القطر - Two perpendicular diameter measurements in mm
 *             🔴 **مطلوب (Required)**
 *             قياسان متعامدان للقطر بالمليمتر
 *           example: [93, 93]
 *         lengths:
 *           type: array
 *           items:
 *             type: number
 *           minItems: 2
 *           maxItems: 3
 *           description: |
 *             9- الطول - Length measurements in mm after capping (2-3 readings)
 *             🔴 **مطلوب (Required)**
 *             من 2 إلى 3 قراءات للطول بالمليمتر
 *           example: [122, 120, 122]
 *         weightGrams:
 *           type: number
 *           description: |
 *             الوزن بالجرام - Weight in grams (for calculating display density)
 *             ⚪ **اختياري (Optional)** - لحساب الكثافة للعرض فقط
 *           example: 1835
 *         directionFactor:
 *           type: number
 *           description: |
 *             معامل اتجاه أخذ العينة - Coring direction factor
 *             🔴 **مطلوب (Required)**
 *             - 2.5 = أفقي (horizontal coring)
 *             - 2.3 = رأسي (vertical coring)
 *           example: 2.5
 *         breakingLoadKN:
 *           type: number
 *           description: |
 *             11- حمل الكسر (كيلو نيوتن) - Breaking load in kN
 *             🔴 **مطلوب (Required)**
 *             أقصى حمل عند انهيار العينة
 *           example: 68.4
 *         failurePattern:
 *           type: string
 *           description: |
 *             12- شكل الإنهيار - Failure pattern description
 *             ⚪ **اختياري (Optional)**
 *           example: "شروخ طولية"
 *         aggregateCondition:
 *           type: string
 *           enum: [dry, natural, saturated]
 *           description: |
 *             14- حالة رطوبة القلب - Moisture condition
 *             🔴 **مطلوب (Required)**
 *             - dry (جافة): معامل = 0.96
 *             - natural (طبيعية): معامل = 1.00
 *             - saturated (مشبعة): معامل = 1.05
 *         reinforcement:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ReinforcementBar'
 *           description: |
 *             16- مقاس ومكان حديد التسليح بالعينة
 *             ⚪ **اختياري (Optional)**
 *             إذا وجد حديد تسليح يؤثر على المقاومة الظاهرية
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
 * /api/calculate/batch:
 *   post:
 *     summary: Calculate multiple core samples with statistics
 *     description: |
 *       ## حساب مجموعة من عينات القلب الخرساني
 *
 *       Calculates equivalent cube strength for multiple core samples based on **ECP 203-2020**.
 *
 *       ### الحقول المطلوبة | Required Fields:
 *       | الحقل | الوصف |
 *       |-------|-------|
 *       | 🔴 diameters | القطر - قياسان متعامدان (مم) |
 *       | 🔴 lengths | الطول - 2-3 قراءات (مم) |
 *       | 🔴 breakingLoadKN | حمل الكسر (كيلو نيوتن) |
 *       | 🔴 aggregateCondition | حالة رطوبة القلب (dry/natural/saturated) |
 *       | 🔴 directionFactor | معامل اتجاه أخذ العينة (2.5 أفقي / 2.3 رأسي) |
 *
 *       ### المعادلة الأساسية:
 *       ```
 *       مقاومة المكعب = مقاومة القلب × Fm × Fg × (معامل_اتجاه / (1.5 + D/L)) × معامل التسليح
 *       ```
 *
 *       ### Statistical Analysis | التحليل الإحصائي:
 *       - **averageStrength**: متوسط المقاومة المستنبطة
 *       - **minimumStrength**: أقل قيمة
 *       - **maximumStrength**: أعلى قيمة
 *       - **standardDeviation**: الانحراف المعياري
 *     tags: [Core Test - اختبار القلب الخرساني]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchCalculationInput'
 *           examples:
 *             minimal:
 *               summary: 🔴 الحد الأدنى (Required fields only)
 *               description: فقط الحقول المطلوبة - diameters, lengths, breakingLoadKN, aggregateCondition, directionFactor
 *               value:
 *                 samples:
 *                   - diameters: [93, 93]
 *                     lengths: [121, 121, 121]
 *                     breakingLoadKN: 142.32
 *                     aggregateCondition: "saturated"
 *                     directionFactor: 2.5
 *                   - diameters: [93, 93]
 *                     lengths: [122, 122, 122]
 *                     breakingLoadKN: 114.78
 *                     aggregateCondition: "saturated"
 *                     directionFactor: 2.5
 *                   - diameters: [93, 93]
 *                     lengths: [135, 135, 135]
 *                     breakingLoadKN: 88.25
 *                     aggregateCondition: "saturated"
 *                     directionFactor: 2.5
 *             bordorat:
 *               summary: 📊 بردورات - عينات مشبعة (Saturated samples)
 *               description: مثال من ملف بردورات قلب خرساني - 3 عينات أعمدة مشبعة
 *               value:
 *                 projectName: "بردورات - عينات أعمدة"
 *                 testingDate: "2024-09-15"
 *                 samples:
 *                   - sampleNumber: "1"
 *                     testedElement: "عمود"
 *                     visualCondition: "متجانسة ويوجد بها فراغات صغيرة وكبيرة"
 *                     aggregateType: "gravel"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [121, 121, 121]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 142.32
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "saturated"
 *                   - sampleNumber: "2"
 *                     testedElement: "عمود"
 *                     visualCondition: "متجانسة ويوجد بها فراغات صغيرة وكبيرة"
 *                     aggregateType: "gravel"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [122, 122, 122]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 114.78
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "saturated"
 *                   - sampleNumber: "3"
 *                     testedElement: "عمود"
 *                     visualCondition: "متجانسة ويوجد بها فراغات صغيرة وكبيرة"
 *                     aggregateType: "gravel"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [135, 135, 135]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 88.25
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "saturated"
 *             kharegi:
 *               summary: 📊 خارجي - عينات جافة (Dry samples)
 *               description: مثال من ملف خارجي قلب خرساني - 3 عينات أعمدة جافة
 *               value:
 *                 projectName: "مبني المدخل والمصافي"
 *                 testingDate: "26/08/2025"
 *                 samples:
 *                   - sampleNumber: "1"
 *                     testedElement: "خرسانة أعمدة - مبني المدخل والمصافي"
 *                     visualCondition: "غير متجانسة ويوجد فراغات صغيرة وكبيرة ويوجد بها طفلة وتعشيش"
 *                     aggregateType: "gravel"
 *                     coringDate: "19/8/2025"
 *                     testingDate: "26/08/2025"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [122, 120, 122]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 68.4
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "dry"
 *                   - sampleNumber: "2"
 *                     testedElement: "خرسانة أعمدة - مبني المدخل والمصافي"
 *                     visualCondition: "غير متجانسة ويوجد فراغات صغيرة وكبيرة ويوجد بها طفلة"
 *                     aggregateType: "gravel"
 *                     coringDate: "19/8/2025"
 *                     testingDate: "26/08/2025"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [116, 116, 115]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 63.6
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "dry"
 *                   - sampleNumber: "3"
 *                     testedElement: "خرسانة حائط - مبني المدخل والمصافي"
 *                     visualCondition: "غير متجانسة ويوجد فراغات صغيرة وكبيرة"
 *                     aggregateType: "gravel"
 *                     coringDate: "19/8/2025"
 *                     testingDate: "26/08/2025"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [112, 114, 113]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 32.8
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "dry"
 *             mowarid:
 *               summary: 📊 مورد - حوائط خرسانية (Concrete walls)
 *               description: مثال من ملف مورد قلب خرساني - 3 عينات حوائط جافة (كسر أحجار)
 *               value:
 *                 projectName: "حوائط خرسانية"
 *                 testingDate: "2025-08-20"
 *                 samples:
 *                   - sampleNumber: "4"
 *                     testedElement: "حائط خرساني رقم (1)"
 *                     visualCondition: "متجانسة ويوجد بها فراغات صغيرة وكبيرة"
 *                     aggregateType: "crushed"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [119, 118, 119]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 268.1
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "dry"
 *                   - sampleNumber: "5"
 *                     testedElement: "حائط خرساني رقم (2)"
 *                     visualCondition: "متجانسة ويوجد بها فراغات صغيرة وكبيرة"
 *                     aggregateType: "crushed"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [115, 113, 115]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 237.5
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "dry"
 *                   - sampleNumber: "6"
 *                     testedElement: "حائط خرساني رقم (3)"
 *                     visualCondition: "متجانسة ويوجد بها فراغات صغيرة وكبيرة"
 *                     aggregateType: "crushed"
 *                     endPreparation: "sulfur_capping"
 *                     diameters: [93, 93]
 *                     lengths: [120, 119, 120]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 269.9
 *                     failurePattern: "شروخ طولية"
 *                     aggregateCondition: "dry"
 *             withReinforcement:
 *               summary: 🔩 مع حديد تسليح (With reinforcement)
 *               description: عينة تحتوي على حديد تسليح - يتم تطبيق معامل تصحيح
 *               value:
 *                 projectName: "عينات مع حديد تسليح"
 *                 samples:
 *                   - sampleNumber: "1"
 *                     testedElement: "عمود خرساني"
 *                     diameters: [93, 93]
 *                     lengths: [116, 116, 115]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 63.6
 *                     aggregateCondition: "dry"
 *                     reinforcement:
 *                       - diameterMm: 8
 *                         distanceFromEndMm: 43
 *                   - sampleNumber: "2"
 *                     testedElement: "عمود خرساني"
 *                     diameters: [93, 93]
 *                     lengths: [120, 120, 120]
 *                     directionFactor: 2.5
 *                     breakingLoadKN: 75.0
 *                     aggregateCondition: "dry"
 *                     reinforcement:
 *                       - diameterMm: 10
 *                         distanceFromEndMm: 30
 *                       - diameterMm: 10
 *                         distanceFromEndMm: 85
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

// =====================================================
// Pull-Off Test Endpoints (اختبار الإقتلاع - تماسك طبقتين)
// Based on BS 1881-Part 207-1992
// =====================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     PullOffSampleInput:
 *       type: object
 *       required:
 *         - diameterMm
 *         - failureLoadKN
 *       properties:
 *         specimenNumber:
 *           type: number
 *           description: |
 *             رقم العينة - Specimen number
 *             ⚪ **اختياري (Optional)**
 *           example: 1
 *         specimenCode:
 *           type: string
 *           description: |
 *             كود العينة - Specimen code
 *             ⚪ **اختياري (Optional)**
 *           example: "MTL/IT/2024/37"
 *         testedItem:
 *           type: string
 *           description: |
 *             العنصر المختبر - Tested item/element
 *             ⚪ **اختياري (Optional)**
 *           example: "العنصر المختبر بلاطة خرسانية"
 *         diameterMm:
 *           type: number
 *           description: |
 *             قطر العينة (مم) - Specimen diameter in mm
 *             🔴 **مطلوب (Required)**
 *           example: 55
 *         failureMode:
 *           type: string
 *           description: |
 *             مكان الإنهيار - Mode/location of failure
 *             ⚪ **اختياري (Optional)**
 *             - concrete_substrate: حدث الإنفصال في البلاطة الخرسانية
 *             - adhesive_layer: حدث الإنفصال في المادة اللاصقة
 *             - interface: حدث الإنفصال في السطح البيني
 *             - overlay: حدث الإنفصال في الطبقة العلوية
 *             - mixed: إنفصال مختلط
 *           example: "حدث الإنفصال في البلاطة الخرسانية"
 *         failureLoadKN:
 *           type: number
 *           description: |
 *             حمل الإنهيار (كيلو نيوتن) - Failure load in kN
 *             🔴 **مطلوب (Required)**
 *           example: 3.63
 *
 *     PullOffSampleResult:
 *       type: object
 *       properties:
 *         specimenNumber:
 *           type: number
 *           description: رقم العينة
 *         specimenCode:
 *           type: string
 *           description: كود العينة
 *         testedItem:
 *           type: string
 *           description: العنصر المختبر
 *         diameterMm:
 *           type: number
 *           description: قطر العينة (مم)
 *         failureMode:
 *           type: string
 *           description: مكان الإنهيار
 *         failureLoadKN:
 *           type: number
 *           description: حمل الإنهيار (كيلو نيوتن)
 *         failureLoadN:
 *           type: number
 *           description: حمل الإنهيار (نيوتن)
 *         areaMm2:
 *           type: number
 *           description: مساحة العينة (مم²)
 *         tensileStrengthMPa:
 *           type: number
 *           description: |
 *             إجهاد الإنهيار / مقاومة التماسك (نيوتن/مم² = MPa)
 *             Tensile adhesion strength
 *
 *     PullOffBatchInput:
 *       type: object
 *       required:
 *         - specimens
 *       properties:
 *         specimens:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PullOffSampleInput'
 *           minItems: 1
 *           description: |
 *             مصفوفة العينات - Array of Pull-Off specimen inputs
 *             🔴 **مطلوب (Required)**
 *         client:
 *           type: string
 *           description: |
 *             الجهة طالبة الإختبار - Client
 *             ⚪ **اختياري (Optional)**
 *         project:
 *           type: string
 *           description: |
 *             المشروع - Project name
 *             ⚪ **اختياري (Optional)**
 *         testingDate:
 *           type: string
 *           description: |
 *             تاريخ إختبار العينات - Testing date
 *             ⚪ **اختياري (Optional)**
 *
 *     PullOffBatchResult:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PullOffSampleResult'
 *           description: Individual specimen results
 *         averageStrength:
 *           type: number
 *           description: متوسط مقاومة التماسك (MPa) - Average tensile adhesion strength
 *         minimumStrength:
 *           type: number
 *           description: أقل مقاومة (MPa)
 *         maximumStrength:
 *           type: number
 *           description: أعلى مقاومة (MPa)
 *         standardDeviation:
 *           type: number
 *           description: الانحراف المعياري (MPa)
 *         coefficientOfVariation:
 *           type: number
 *           description: معامل الاختلاف (%) - Coefficient of variation
 *         expandedUncertaintyMPa:
 *           type: number
 *           description: قيمة اللايقين بحدود ثقة 95% (MPa) - Expanded uncertainty
 *         uncertainty:
 *           type: object
 *           description: Detailed uncertainty components
 */

/**
 * @swagger
 * /api/pulloff/calculate/batch:
 *   post:
 *     summary: Calculate multiple Pull-Off test specimens with statistics
 *     description: |
 *       Calculates tensile adhesion strength for multiple specimens and provides
 *       statistical summary including average, standard deviation, coefficient of
 *       variation, and uncertainty calculations.
 *
 *       ## حساب مجموعة من عينات اختبار الإقتلاع
 *
 *       ### Statistical Analysis:
 *       - **Average strength**: Mean of all tensile strengths
 *       - **Standard deviation**: Sample standard deviation
 *       - **Coefficient of variation**: (SD / Mean) × 100%
 *       - **Expanded uncertainty**: At 95% confidence level (k=2)
 *
 *       ### Uncertainty Calculation:
 *       Based on GUM (Guide to Expression of Uncertainty in Measurement)
 *       considering repeatability, calibration, and resolution uncertainties.
 *
 *       ### Standard:
 *       Test performed according to **BS 1881-Part 207-1992**
 *     tags: [Pull-Off Test - اختبار الإقتلاع]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PullOffBatchInput'
 *           examples:
 *             minimal:
 *               summary: 🔴 الحد الأدنى (Required fields only)
 *               description: فقط الحقول المطلوبة - diameterMm و failureLoadKN
 *               value:
 *                 specimens:
 *                   - diameterMm: 55
 *                     failureLoadKN: 3.63
 *                   - diameterMm: 55
 *                     failureLoadKN: 2.87
 *                   - diameterMm: 49.5
 *                     failureLoadKN: 3.25
 *                   - diameterMm: 55
 *                     failureLoadKN: 3.31
 *                   - diameterMm: 55
 *                     failureLoadKN: 4.08
 *                   - diameterMm: 55
 *                     failureLoadKN: 4.59
 *             full:
 *               summary: ⚪ كامل البيانات (All fields - Excel match)
 *               description: جميع الحقول مطابقة لملف Excel
 *               value:
 *                 client: "IAS"
 *                 project: "--------"
 *                 testingDate: "2024-06-15"
 *                 specimens:
 *                   - specimenNumber: 1
 *                     specimenCode: "MTL/IT/2024/37"
 *                     testedItem: "العنصر المختبر بلاطة خرسانية"
 *                     diameterMm: 55
 *                     failureMode: "حدث الإنفصال في البلاطة الخرسانية"
 *                     failureLoadKN: 3.63
 *                   - specimenNumber: 2
 *                     specimenCode: "MTL/IT/2024/38"
 *                     testedItem: "العنصر المختبر بلاطة خرسانية"
 *                     diameterMm: 55
 *                     failureMode: "حدث الإنفصال في البلاطة الخرسانية"
 *                     failureLoadKN: 2.87
 *                   - specimenNumber: 3
 *                     specimenCode: "MTL/IT/2024/39"
 *                     testedItem: "العنصر المختبر بلاطة خرسانية"
 *                     diameterMm: 49.5
 *                     failureMode: "حدث الإنفصال في المادة اللاصقة"
 *                     failureLoadKN: 3.25
 *                   - specimenNumber: 4
 *                     specimenCode: "MTL/IT/2024/40"
 *                     testedItem: "العنصر المختبر بلاطة خرسانية"
 *                     diameterMm: 55
 *                     failureMode: "حدث الإنفصال في البلاطة الخرسانية"
 *                     failureLoadKN: 3.31
 *                   - specimenNumber: 5
 *                     specimenCode: "MTL/IT/2024/41"
 *                     testedItem: "العنصر المختبر بلاطة خرسانية"
 *                     diameterMm: 55
 *                     failureMode: "حدث الإنفصال في البلاطة الخرسانية"
 *                     failureLoadKN: 4.08
 *                   - specimenNumber: 6
 *                     specimenCode: "MTL/IT/2024/42"
 *                     testedItem: "العنصر المختبر بلاطة خرسانية"
 *                     diameterMm: 55
 *                     failureMode: "حدث الإنفصال في البلاطة الخرسانية"
 *                     failureLoadKN: 4.59
 *     responses:
 *       200:
 *         description: Successful batch calculation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PullOffBatchResult'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/pulloff/calculate/batch', (req: Request, res: Response) => {
  try {
    const { specimens } = req.body;
    if (!Array.isArray(specimens) || specimens.length === 0) {
      throw new Error('specimens array is required and must not be empty');
    }
    const validatedSpecimens = specimens.map(validatePullOffSampleInput);
    const result = calculatePullOffBatch(validatedSpecimens);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: 'Invalid input',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Health check endpoint (not documented in Swagger)
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

  // directionFactor is required and must be positive (typically 2.3 or 2.5)
  if (typeof data.directionFactor !== 'number' || data.directionFactor <= 0) {
    throw new Error('directionFactor (معامل اتجاه أخذ العينة) is required and must be a positive number (typically 2.3 or 2.5)');
  }

  // weightGrams is optional but if provided must be positive
  if (data.weightGrams !== undefined && (typeof data.weightGrams !== 'number' || data.weightGrams <= 0)) {
    throw new Error('weightGrams must be a positive number if provided');
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
    directionFactor: data.directionFactor as number,
    breakingLoadKN: data.breakingLoadKN as number,
    failurePattern: data.failurePattern as string | undefined,
    aggregateCondition: data.aggregateCondition as AggregateCondition,
    reinforcement: data.reinforcement as CoreSampleInput['reinforcement'],
  };
}

function validatePullOffSampleInput(input: unknown): PullOffSampleInput {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be an object');
  }

  const data = input as Record<string, unknown>;

  // diameterMm is required and must be positive
  if (typeof data.diameterMm !== 'number' || data.diameterMm <= 0) {
    throw new Error('diameterMm must be a positive number');
  }

  // failureLoadKN is required and must be positive
  if (typeof data.failureLoadKN !== 'number' || data.failureLoadKN <= 0) {
    throw new Error('failureLoadKN must be a positive number');
  }

  return {
    specimenNumber: data.specimenNumber as number | string | undefined,
    specimenCode: data.specimenCode as string | undefined,
    testedItem: data.testedItem as string | undefined,
    diameterMm: data.diameterMm as number,
    failureMode: data.failureMode as string | undefined,
    failureLoadKN: data.failureLoadKN as number,
  };
}

export default router;
