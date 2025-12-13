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

  /** الوزن بالجرام - Weight in grams (used to calculate density) */
  weightGrams?: number;

  /** 10- كثافة القلب الخرساني (جم/سم3) - Can be provided directly or calculated from weight */
  density?: number;

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
