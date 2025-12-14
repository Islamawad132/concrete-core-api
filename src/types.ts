/**
 * Concrete Core Test Types
 * Based on Egyptian Standard for Concrete Core Testing
 * المركز القومي لبحوث الاسكان و البناء
 * معهد بحوث مواد البناء و ضبط الجودة
 */

export type AggregateCondition = 'dry' | 'natural' | 'saturated';
export type AggregateConditionArabic = 'جافة' | 'طبيعية' | 'مشبعة';

export type AggregateType = 'gravel' | 'crushed' | 'lightweight';
export type AggregateTypeArabic = 'زلط' | 'دولوميت' | 'خفيف';

export type EndPreparation = 'sulfur_capping' | 'grinding' | 'neoprene_pads';
export type EndPreparationArabic = 'تغطية بالكبريت' | 'تسوية بالجلخ' | 'وسائد نيوبرين';

/**
 * Project/Test Metadata - البيانات الواردة من الجهة طالبة الإختبار
 */
export interface TestMetadata {
  /** الجهة طالبة الإختبار */
  requestingEntity?: string;
  /** المشروع */
  projectName?: string;
  /** الجهة المالكة */
  owner?: string;
  /** الجهة المنفذة (المقاول) */
  contractor?: string;
  /** الاستشارى */
  consultant?: string;
  /** بيانات أخرى إضافية */
  additionalInfo?: string;
}

/**
 * Core Sample Input - exactly matching Excel structure
 * نتائج إختبار عينات القلب الخرسانى
 */
export interface CoreSampleInput {
  /** رقم العينة - Sample number */
  sampleNumber?: number | string;

  /** 1- العنصر المختبر - Tested structural element */
  testedElement?: string;

  /** 2- الحالة الظاهرية للعينة - Visual condition (voids, cracks, compaction) */
  visualCondition?: string;

  /** 3- نوع الركام - Aggregate type */
  aggregateType?: AggregateType;

  /** 4- تاريخ اخذ القلب - Coring date */
  coringDate?: string;

  /** 5- تاريخ إختبار القلب - Testing date */
  testingDate?: string;

  /** 6- عمر المعالجة بالغمر فى الماء عند الإختبار (يوم) - Curing age in days */
  curingAgeDays?: number | string;

  /** 7- طريقة إعداد نهاية العينة - End preparation method */
  endPreparation?: EndPreparation;

  /** 8- القطر - Diameter measurements in mm (2 perpendicular measurements) */
  diameters: [number, number];

  /** 9- الطول - Length measurements in mm after capping (2-3 measurements) */
  lengths: number[];

  /** الوزن بالجرام - Weight in grams (used to calculate display density) */
  weightGrams?: number;

  /** معامل اتجاه أخذ العينة - Direction factor (typically 2.5 horizontal, 2.3 vertical) */
  directionFactor: number;

  /** 11- حمل الكسر (kN) - Breaking load in kN (as in Excel Q19) */
  breakingLoadKN: number;

  /** 12- شكل الإنهيار - Failure pattern */
  failurePattern?: string;

  /** 14- حالة رطوبة القلب - Aggregate moisture condition */
  aggregateCondition: AggregateCondition;

  /** 16- مقاس ومكان حديد التسليح بالعينة - Reinforcement bars in sample */
  reinforcement?: Array<{
    /** قطر الحديد (مم) */
    diameterMm: number;
    /** المسافة من أقرب نهاية (مم) */
    distanceFromEndMm: number;
  }>;
}

/**
 * Core Sample Result - matching Excel output structure
 * النتائج
 */
export interface CoreSampleResult {
  /** رقم العينة - Sample number (echoed from input) */
  sampleNumber?: number | string;

  /** 8- القطر المتوسط للعينة (مم) - Average diameter in mm */
  averageDiameter: number;

  /** 9- طول العينة بعد التغطية (مم) - Average length in mm */
  averageLength: number;

  /** نسبة الطول للقطر - L/D ratio */
  ldRatio: number;

  /** 10- كثافة القلب الخرساني (جم/سم3) - Calculated density */
  calculatedDensity: number;

  /** 11- حمل الكسر للقلب الخرسانى (طن) - Breaking load in tons */
  breakingLoadTons: number;

  /** 13- مقاومة الضغط للقلب الخرسانى (كجم/سم2) - Core compressive strength */
  coreStrength: number;

  /** 14- عامل تأثير درجة رطوبة القلب (Fm) - Moisture correction factor */
  moistureCorrectionFactor: number;

  /** 15- عامل تأثير عملية القطع عند استخراج القلب (Fg) - Cutting correction factor */
  cuttingCorrectionFactor: number;

  /** عامل تصحيح نسبة الطول للقطر - L/D correction factor (for reference) */
  ldCorrectionFactor: number;

  /** عامل تصحيح حديد التسليح - Reinforcement correction factor */
  reinforcementCorrectionFactor: number;

  /** 17- مقاومة الضغط المستنبطة للمكعب الخرسانى بالموقع (كجم/سم2) - Equivalent cube strength */
  equivalentCubeStrength: number;

  /** مقاومة الضغط المستنبطة (ميجا باسكال) - Equivalent cube strength in MPa */
  equivalentCubeStrengthMPa: number;
}

export interface BatchCalculationInput {
  samples: CoreSampleInput[];
  projectName?: string;
  testingDate?: string;
}

export interface BatchCalculationResult {
  results: CoreSampleResult[];
  averageStrength: number;
  minimumStrength: number;
  maximumStrength: number;
  standardDeviation: number;
}

export interface LDCorrectionTable {
  ldRatio: number;
  correctionFactor: number;
}

export interface MoistureCorrectionTable {
  condition: AggregateCondition;
  conditionArabic: AggregateConditionArabic;
  factor: number;
}

// =====================================================
// Pull-Off Test Types (اختبار الإقتلاع - تماسك طبقتين)
// Based on BS 1881-Part 207-1992
// =====================================================

/**
 * Failure mode types for Pull-Off test
 * مكان/نوع الإنهيار
 */
export type PullOffFailureMode =
  | 'concrete_substrate'     // حدث الإنفصال في البلاطة الخرسانية
  | 'adhesive_layer'         // حدث الإنفصال في المادة اللاصقة
  | 'interface'              // حدث الإنفصال في السطح البيني
  | 'overlay'                // حدث الإنفصال في الطبقة العلوية
  | 'mixed';                 // إنفصال مختلط

export type PullOffFailureModeArabic =
  | 'حدث الإنفصال في البلاطة الخرسانية'
  | 'حدث الإنفصال في المادة اللاصقة'
  | 'حدث الإنفصال في السطح البيني'
  | 'حدث الإنفصال في الطبقة العلوية'
  | 'إنفصال مختلط';

/**
 * Pull-Off Test Sample Input
 * نتائج اختبار الإقتلاع
 */
export interface PullOffSampleInput {
  /** رقم العينة - Specimen number */
  specimenNumber?: number | string;

  /** كود العينة - Specimen code */
  specimenCode?: string;

  /** العنصر المختبر - Tested item/element */
  testedItem?: string;

  /** قطر العينة (مم) - Specimen diameter in mm */
  diameterMm: number;

  /** مكان الإنهيار - Mode/location of failure */
  failureMode?: PullOffFailureMode | string;

  /** حمل الإنهيار (كيلو نيوتن) - Failure load in kN */
  failureLoadKN: number;
}

/**
 * Pull-Off Test Sample Result
 * نتائج العينة
 */
export interface PullOffSampleResult {
  /** رقم العينة - Specimen number */
  specimenNumber?: number | string;

  /** كود العينة - Specimen code */
  specimenCode?: string;

  /** العنصر المختبر - Tested item */
  testedItem?: string;

  /** قطر العينة (مم) - Specimen diameter */
  diameterMm: number;

  /** مكان الإنهيار - Mode of failure */
  failureMode?: string;

  /** حمل الإنهيار (كيلو نيوتن) - Failure load in kN */
  failureLoadKN: number;

  /** حمل الإنهيار (نيوتن) - Failure load in N */
  failureLoadN: number;

  /** مساحة العينة (مم²) - Specimen area */
  areaMm2: number;

  /** إجهاد الإنهيار / مقاومة التماسك (نيوتن/مم² = MPa) - Tensile adhesion strength */
  tensileStrengthMPa: number;
}

/**
 * Pull-Off Batch Calculation Input
 */
export interface PullOffBatchInput {
  /** Array of specimens */
  specimens: PullOffSampleInput[];

  /** الجهة طالبة الإختبار - Client */
  client?: string;

  /** المشروع - Project */
  project?: string;

  /** الجهة المالكة - Owner */
  owner?: string;

  /** الجهة المنفذة - Contractor */
  contractor?: string;

  /** الاستشاري - Consultant */
  consultant?: string;

  /** بيانات إضافية - Additional info */
  additionalInfo?: string;

  /** رقم الوارد - Delivery number */
  deliveryNumber?: string;

  /** تاريخ الوارد - Delivery date */
  deliveryDate?: string;

  /** كود الجهاز - Apparatus code */
  apparatusCode?: string | number;

  /** تاريخ إختبار العينات - Testing date */
  testingDate?: string;
}

/**
 * Uncertainty components for Pull-Off test
 * مكونات اللايقين
 */
export interface PullOffUncertainty {
  /** Standard deviation of diameter measurements */
  diameterSD: number;

  /** Average diameter */
  averageDiameter: number;

  /** Standard deviation of load measurements */
  loadSD: number;

  /** Average load */
  averageLoad: number;

  /** Average tensile strength */
  averageStrength: number;

  /** Repeatability uncertainty for diameter (URD) */
  uncertaintyRepeatabilityDiameter: number;

  /** Calibration uncertainty for diameter */
  uncertaintyCalibrationDiameter: number;

  /** Resolution uncertainty for diameter */
  uncertaintyResolutionDiameter: number;

  /** Repeatability uncertainty for load (URP) */
  uncertaintyRepeatabilityLoad: number;

  /** Calibration uncertainty for load */
  uncertaintyCalibrationLoad: number;

  /** Resolution uncertainty for load */
  uncertaintyResolutionLoad: number;

  /** Combined Type A uncertainty */
  uncertaintyTypeA: number;

  /** Combined Type B uncertainty */
  uncertaintyTypeB: number;

  /** Combined standard uncertainty */
  combinedUncertainty: number;

  /** Expanded uncertainty at 95% confidence (k=2) */
  expandedUncertainty: number;
}

/**
 * Pull-Off Batch Calculation Result
 * نتائج حساب مجموعة عينات الإقتلاع
 */
export interface PullOffBatchResult {
  /** Individual specimen results */
  results: PullOffSampleResult[];

  /** متوسط مقاومة التماسك (MPa) - Average tensile adhesion strength */
  averageStrength: number;

  /** متوسط الحمل (KN) - Average load in kN */
  averageLoadKN: number;

  /** أقل مقاومة (MPa) - Minimum strength */
  minimumStrength: number;

  /** أعلى مقاومة (MPa) - Maximum strength */
  maximumStrength: number;

  /** الانحراف المعياري (MPa) - Standard deviation of strengths */
  standardDeviation: number;

  /** معامل الاختلاف (%) - Coefficient of variation (from loads, matching Excel) */
  coefficientOfVariation: number;

  /** حسابات اللايقين - Uncertainty calculations */
  uncertainty: PullOffUncertainty;

  /** قيمة اللايقين بحدود ثقة 95% (MPa) - Expanded uncertainty at 95% confidence */
  expandedUncertaintyMPa: number;
}

// =====================================================
// Schmidt Hammer Test Types (اختبار مطرقة الإرتداد)
// Based on EN 12504-2-2021
// =====================================================

/**
 * Hammer direction/angle for Schmidt Hammer test
 * اتجاه المطرقة
 */
export type HammerDirection = 'horizontal' | 'downward' | 'upward';
export type HammerDirectionArabic = 'أفقي' | 'لأسفل ↓' | 'لأعلى ↑';

/**
 * Schmidt Hammer Test Element Input
 * بيانات العنصر الإنشائي المختبر
 */
export interface SchmidtHammerElementInput {
  /** العنصر الإنشائي المختبر - Structural element being tested */
  elementName?: string;

  /** كود العنصر - Element code */
  elementCode?: string;

  /** اتجاه المطرقة - Hammer direction/angle */
  hammerDirection?: HammerDirection | string;

  /** قراءات المطرقة (15 قراءة) - Rebound readings (15 readings) */
  readings: number[];

  /** ملاحظات - Notes */
  notes?: string;
}

/**
 * Schmidt Hammer Anvil Calibration Input
 * قراءات سندان المعايرة
 */
export interface SchmidtHammerAnvilInput {
  /** قراءات سندان المعايرة قبل الإختبار - Anvil readings before test */
  readingsBefore: number[];

  /** قراءات سندان المعايرة بعد الإختبار - Anvil readings after test */
  readingsAfter: number[];
}

/**
 * Schmidt Hammer Batch Input
 * مدخلات اختبار مطرقة الإرتداد
 */
export interface SchmidtHammerBatchInput {
  /** Array of test elements */
  elements: SchmidtHammerElementInput[];

  /** قراءات سندان المعايرة - Anvil calibration readings */
  anvilCalibration: SchmidtHammerAnvilInput;

  /** كود المطرقة - Hammer code */
  hammerCode?: string | number;

  /** الجهة طالبة الإختبار - Client */
  client?: string;

  /** المشروع - Project */
  project?: string;

  /** الجهة المالكة - Owner */
  owner?: string;

  /** الجهة المنفذة - Contractor */
  contractor?: string;

  /** الاستشاري - Consultant */
  consultant?: string;

  /** بيانات إضافية - Additional info */
  additionalInfo?: string;

  /** تاريخ إجراء الإختبار - Testing date */
  testingDate?: string;

  /** درجة حرارة الجو - Ambient temperature */
  ambientTemperature?: string;

  /** توقيت إجراء الإختبار - Testing time */
  testingTime?: string;
}

/**
 * Schmidt Hammer Uncertainty Components
 * مكونات اللايقين
 */
export interface SchmidtHammerUncertainty {
  /** Repeatability uncertainty (URP) */
  repeatabilityUncertainty: number;

  /** Resolution uncertainty */
  resolutionUncertainty: number;

  /** Calibration uncertainty */
  calibrationUncertainty: number;

  /** Combined uncertainty (UComp) */
  combinedUncertainty: number;

  /** Coverage factor (k) */
  coverageFactor: number;

  /** Expanded uncertainty at 95% confidence */
  expandedUncertainty: number;
}

/**
 * Schmidt Hammer Test Element Result
 * نتائج العنصر الإنشائي المختبر
 */
export interface SchmidtHammerElementResult {
  /** العنصر الإنشائي المختبر - Structural element name */
  elementName?: string;

  /** كود العنصر - Element code */
  elementCode?: string;

  /** اتجاه المطرقة - Hammer direction */
  hammerDirection?: string;

  /** القراءات الأصلية - Original readings */
  originalReadings: number[];

  /** القراءات المصححة (بعد تطبيق RSA) - Corrected readings */
  correctedReadings: number[];

  /** الوسيط لقراءات رقم الإرتداد - Median of corrected rebound readings */
  medianRebound: number;

  /** الحد الأدنى للقبول (0.75 × الوسيط) - Lower acceptance limit */
  lowerLimit: number;

  /** الحد الأعلى للقبول (1.25 × الوسيط) - Upper acceptance limit */
  upperLimit: number;

  /** عدد القراءات المقبولة - Number of valid readings */
  validReadingsCount: number;

  /** الانحراف المعياري - Standard deviation */
  standardDeviation: number;

  /** حسابات اللايقين - Uncertainty calculations */
  uncertainty: SchmidtHammerUncertainty;

  /** قيمة اللايقين بحدود ثقة 95% (±) - Expanded uncertainty at 95% confidence */
  expandedUncertainty: number;

  /** مقاومة الضغط التقريبية (كجم/سم²) - Approximate compressive strength (indicative only) */
  approximateStrengthKgCm2?: number;

  /** ملاحظات - Notes */
  notes?: string;
}

/**
 * Schmidt Hammer Batch Result
 * نتائج اختبار مطرقة الإرتداد
 */
export interface SchmidtHammerBatchResult {
  /** Individual element results */
  results: SchmidtHammerElementResult[];

  /** معامل التصحيح (RSA) - Correction factor from anvil */
  correctionFactorRSA: number;

  /** وسيط قراءات سندان المعايرة - Median of anvil readings */
  anvilMedian: number;

  /** كود المطرقة - Hammer code */
  hammerCode?: string | number;

  /** تاريخ الإختبار - Testing date */
  testingDate?: string;
}
