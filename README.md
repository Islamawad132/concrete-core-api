# المركز القومي لبحوث الاسكان والبناء
## معهد بحوث مواد البناء و ضبط الجودة
### معمل الخرسانة

### Housing and Building National Research Center (HBRC)
### Building Materials Research & Quality Control Institute
#### Concrete Laboratory

---

# API اختبارات الخرسانة | Concrete Tests API

واجهة برمجية لحساب اختبارات الخرسانة المتصلدة وفقاً للمواصفات المصرية والبريطانية والأوروبية.

A REST API for calculating hardened concrete test results according to Egyptian, British, and European standards.

## التشغيل | Getting Started

```bash
npm install
npm run build
npm start
```

**Swagger UI**: http://localhost:3000/api-docs

---

# الاختبارات المتاحة | Available Tests

| الاختبار (Arabic) | Test (English) | المواصفة (Standard) | Endpoint |
|-------------------|----------------|---------------------|----------|
| اختبار القلب الخرساني | Concrete Core Test | ECP 203-2020 | `POST /api/calculate/batch` |
| اختبار الإقتلاع | Pull-Off Test | BS 1881-207 | `POST /api/pulloff/calculate/batch` |
| اختبار مطرقة الإرتداد | Schmidt Hammer Test | EN 12504-2-2021 | `POST /api/schmidt/calculate/batch` |

---

# 1. اختبار القلب الخرساني | Concrete Core Test

**Endpoint:** `POST /api/calculate/batch`

اختبار مقاومة الضغط للخرسانة المتصلدة عن طريق استخراج عينات أسطوانية من المنشأ.

Compressive strength test of hardened concrete by extracting cylindrical samples from the structure.

## Request Body

```json
{
  "samples": [
    {
      "sampleNumber": "1",
      "testedElement": "خرسانة أعمدة - Column concrete",
      "visualCondition": "متجانسة - Homogeneous",
      "aggregateType": "gravel",
      "coringDate": "2024-08-19",
      "testingDate": "2024-08-26",
      "curingAgeDays": "2",
      "endPreparation": "sulfur_capping",
      "diameters": [93, 93],
      "lengths": [122, 120, 122],
      "weightGrams": 1835,
      "directionFactor": 2.5,
      "breakingLoadKN": 68.4,
      "failurePattern": "شروخ طولية - Longitudinal cracks",
      "aggregateCondition": "dry",
      "reinforcement": [
        {
          "diameterMm": 8,
          "distanceFromEndMm": 43
        }
      ]
    }
  ],
  "projectName": "اسم المشروع - Project Name",
  "testingDate": "2024-08-26"
}
```

### Request Fields | حقول الطلب

| Field | الحقل | Type | Required | Description | الوصف |
|-------|-------|------|----------|-------------|-------|
| `samples` | العينات | array | ✅ Yes | Array of core samples | مصفوفة عينات القلب الخرساني |
| `projectName` | اسم المشروع | string | ❌ No | Project name | اسم المشروع |
| `testingDate` | تاريخ الاختبار | string | ❌ No | Testing date | تاريخ إجراء الاختبار |

### Sample Fields | حقول العينة

| Field | الحقل | Type | Required | Description | الوصف |
|-------|-------|------|----------|-------------|-------|
| `diameters` | القطر | [number, number] | ✅ Yes | Two perpendicular diameter measurements (mm) | قياسان متعامدان للقطر (مم) |
| `lengths` | الطول | number[] | ✅ Yes | 2-3 length measurements (mm) | 2-3 قياسات للطول (مم) |
| `breakingLoadKN` | حمل الكسر | number | ✅ Yes | Breaking load in kN | حمل الكسر بالكيلو نيوتن |
| `aggregateCondition` | حالة الرطوبة | string | ✅ Yes | `"dry"` / `"natural"` / `"saturated"` | جافة / طبيعية / مشبعة |
| `directionFactor` | معامل الاتجاه | number | ✅ Yes | 2.5 (horizontal) / 2.3 (vertical) | 2.5 (أفقي) / 2.3 (رأسي) |
| `sampleNumber` | رقم العينة | string | ❌ No | Sample identifier | رقم تعريف العينة |
| `testedElement` | العنصر المختبر | string | ❌ No | Structural element name | اسم العنصر الإنشائي |
| `visualCondition` | الحالة الظاهرية | string | ❌ No | Visual condition | الحالة الظاهرية للعينة |
| `aggregateType` | نوع الركام | string | ❌ No | `"gravel"` / `"crushed"` / `"lightweight"` | زلط / دولوميت / خفيف |
| `coringDate` | تاريخ أخذ القلب | string | ❌ No | Date core was extracted | تاريخ استخراج القلب |
| `testingDate` | تاريخ الاختبار | string | ❌ No | Date core was tested | تاريخ اختبار القلب |
| `curingAgeDays` | أيام المعالجة | string | ❌ No | Curing age in days | عمر المعالجة بالأيام |
| `endPreparation` | إعداد النهاية | string | ❌ No | `"sulfur_capping"` / `"grinding"` / `"neoprene_pads"` | تغطية بالكبريت / جلخ / وسائد نيوبرين |
| `weightGrams` | الوزن | number | ❌ No | Weight in grams | الوزن بالجرام |
| `failurePattern` | شكل الإنهيار | string | ❌ No | Failure pattern description | وصف شكل الإنهيار |
| `reinforcement` | حديد التسليح | array | ❌ No | Reinforcement bars info | معلومات حديد التسليح |

### Reinforcement Bar Fields | حقول حديد التسليح

| Field | الحقل | Type | Required | Description | الوصف |
|-------|-------|------|----------|-------------|-------|
| `diameterMm` | قطر السيخ | number | ✅ Yes | Bar diameter in mm | قطر سيخ الحديد (مم) |
| `distanceFromEndMm` | المسافة من النهاية | number | ✅ Yes | Distance from nearest end (mm) | المسافة من أقرب نهاية (مم) |

---

## Response Body

```json
{
  "results": [
    {
      "sampleNumber": "1",
      "averageDiameter": 93,
      "averageLength": 121.33,
      "ldRatio": 1.3047,
      "calculatedDensity": 2.2263,
      "breakingLoadTons": 6.84,
      "coreStrength": 100.69,
      "moistureCorrectionFactor": 0.96,
      "cuttingCorrectionFactor": 1.12,
      "ldCorrectionFactor": 1.07,
      "reinforcementCorrectionFactor": 1.0,
      "equivalentCubeStrength": 119.42,
      "equivalentCubeStrengthMPa": 11.71
    }
  ],
  "averageStrength": 119.42,
  "minimumStrength": 119.42,
  "maximumStrength": 119.42,
  "standardDeviation": 0
}
```

### Response Fields | حقول الاستجابة

| Field | الحقل | Type | Description | الوصف |
|-------|-------|------|-------------|-------|
| `results` | النتائج | array | Individual sample results | نتائج العينات الفردية |
| `averageStrength` | متوسط المقاومة | number | Average equivalent cube strength (kg/cm²) | متوسط المقاومة المستنبطة (كجم/سم²) |
| `minimumStrength` | أقل مقاومة | number | Minimum strength (kg/cm²) | أقل قيمة للمقاومة (كجم/سم²) |
| `maximumStrength` | أعلى مقاومة | number | Maximum strength (kg/cm²) | أعلى قيمة للمقاومة (كجم/سم²) |
| `standardDeviation` | الانحراف المعياري | number | Standard deviation (kg/cm²) | الانحراف المعياري (كجم/سم²) |

### Sample Result Fields | حقول نتيجة العينة

| Field | الحقل | Type | Description | الوصف |
|-------|-------|------|-------------|-------|
| `averageDiameter` | القطر المتوسط | number | Average diameter (mm) | متوسط القطر (مم) |
| `averageLength` | الطول المتوسط | number | Average length (mm) | متوسط الطول (مم) |
| `ldRatio` | نسبة L/D | number | Length to diameter ratio | نسبة الطول للقطر |
| `calculatedDensity` | الكثافة المحسوبة | number | Calculated density (g/cm³) | الكثافة المحسوبة (جم/سم³) |
| `breakingLoadTons` | حمل الكسر | number | Breaking load (tons) | حمل الكسر (طن) |
| `coreStrength` | مقاومة القلب | number | Core compressive strength (kg/cm²) | مقاومة الضغط للقلب (كجم/سم²) |
| `moistureCorrectionFactor` | معامل الرطوبة Fm | number | Moisture correction factor | معامل تصحيح الرطوبة |
| `cuttingCorrectionFactor` | معامل القطع Fg | number | Cutting correction factor (1.12) | معامل تصحيح القطع |
| `ldCorrectionFactor` | معامل L/D | number | L/D correction factor | معامل تصحيح نسبة الطول للقطر |
| `reinforcementCorrectionFactor` | معامل التسليح | number | Reinforcement correction factor | معامل تصحيح حديد التسليح |
| `equivalentCubeStrength` | المقاومة المستنبطة | number | **Equivalent cube strength (kg/cm²)** | **المقاومة المستنبطة للمكعب (كجم/سم²)** |
| `equivalentCubeStrengthMPa` | المقاومة (MPa) | number | Equivalent cube strength (MPa) | المقاومة المستنبطة (ميجا باسكال) |

---

## Example | مثال

### Request

```bash
curl -X POST http://localhost:3000/api/calculate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "samples": [
      {
        "diameters": [93, 93],
        "lengths": [121, 121, 121],
        "breakingLoadKN": 142.32,
        "aggregateCondition": "saturated",
        "directionFactor": 2.5
      },
      {
        "diameters": [93, 93],
        "lengths": [122, 122, 122],
        "breakingLoadKN": 114.78,
        "aggregateCondition": "saturated",
        "directionFactor": 2.5
      }
    ]
  }'
```

### Response

```json
{
  "results": [
    {
      "averageDiameter": 93,
      "averageLength": 121,
      "coreStrength": 209.51,
      "equivalentCubeStrength": 265.74,
      "equivalentCubeStrengthMPa": 26.06
    },
    {
      "averageDiameter": 93,
      "averageLength": 122,
      "coreStrength": 168.97,
      "equivalentCubeStrength": 218.09,
      "equivalentCubeStrengthMPa": 21.39
    }
  ],
  "averageStrength": 241.915,
  "minimumStrength": 218.09,
  "maximumStrength": 265.74,
  "standardDeviation": 33.69
}
```

---

# 2. اختبار الإقتلاع | Pull-Off Test

**Endpoint:** `POST /api/pulloff/calculate/batch`

اختبار قوة التماسك بين طبقتين من الخرسانة أو بين طبقة خرسانية ومادة لاصقة.

Test for tensile adhesion strength between two concrete layers or between concrete and adhesive material.

## Request Body

```json
{
  "specimens": [
    {
      "specimenNumber": 1,
      "specimenCode": "MTL/IT/2024/37",
      "testedItem": "بلاطة خرسانية - Concrete slab",
      "diameterMm": 55,
      "failureMode": "حدث الإنفصال في البلاطة الخرسانية - Failure in concrete substrate",
      "failureLoadKN": 3.63
    }
  ],
  "client": "اسم العميل - Client Name",
  "project": "اسم المشروع - Project Name",
  "testingDate": "2024-06-15"
}
```

### Request Fields | حقول الطلب

| Field | الحقل | Type | Required | Description | الوصف |
|-------|-------|------|----------|-------------|-------|
| `specimens` | العينات | array | ✅ Yes | Array of specimens | مصفوفة العينات |
| `client` | العميل | string | ❌ No | Client name | اسم الجهة طالبة الاختبار |
| `project` | المشروع | string | ❌ No | Project name | اسم المشروع |
| `testingDate` | تاريخ الاختبار | string | ❌ No | Testing date | تاريخ إجراء الاختبار |

### Specimen Fields | حقول العينة

| Field | الحقل | Type | Required | Description | الوصف |
|-------|-------|------|----------|-------------|-------|
| `diameterMm` | القطر | number | ✅ Yes | Specimen diameter (mm) | قطر العينة (مم) |
| `failureLoadKN` | حمل الإنهيار | number | ✅ Yes | Failure load (kN) | حمل الإنهيار (كيلو نيوتن) |
| `specimenNumber` | رقم العينة | number | ❌ No | Specimen number | رقم العينة |
| `specimenCode` | كود العينة | string | ❌ No | Specimen code | كود العينة |
| `testedItem` | العنصر المختبر | string | ❌ No | Tested item description | وصف العنصر المختبر |
| `failureMode` | مكان الإنهيار | string | ❌ No | Mode/location of failure | مكان حدوث الإنهيار |

---

## Response Body

```json
{
  "results": [
    {
      "specimenNumber": 1,
      "specimenCode": "MTL/IT/2024/37",
      "testedItem": "بلاطة خرسانية",
      "diameterMm": 55,
      "failureMode": "حدث الإنفصال في البلاطة الخرسانية",
      "failureLoadKN": 3.63,
      "failureLoadN": 3630,
      "areaMm2": 2375.83,
      "tensileStrengthMPa": 1.528
    }
  ],
  "averageStrength": 1.528,
  "minimumStrength": 1.528,
  "maximumStrength": 1.528,
  "standardDeviation": 0,
  "coefficientOfVariation": 0,
  "expandedUncertaintyMPa": 0.352,
  "uncertainty": {
    "repeatabilityUncertainty": 0,
    "resolutionUncertainty": 0.0577,
    "calibrationUncertainty": 0.0133,
    "combinedUncertainty": 0.176,
    "coverageFactor": 2,
    "expandedUncertainty": 0.352
  }
}
```

### Response Fields | حقول الاستجابة

| Field | الحقل | Type | Description | الوصف |
|-------|-------|------|-------------|-------|
| `results` | النتائج | array | Individual specimen results | نتائج العينات الفردية |
| `averageStrength` | متوسط المقاومة | number | Average tensile strength (MPa) | متوسط مقاومة التماسك (MPa) |
| `minimumStrength` | أقل مقاومة | number | Minimum strength (MPa) | أقل قيمة للمقاومة (MPa) |
| `maximumStrength` | أعلى مقاومة | number | Maximum strength (MPa) | أعلى قيمة للمقاومة (MPa) |
| `standardDeviation` | الانحراف المعياري | number | Standard deviation (MPa) | الانحراف المعياري (MPa) |
| `coefficientOfVariation` | معامل الاختلاف | number | Coefficient of variation (%) | معامل الاختلاف (%) |
| `expandedUncertaintyMPa` | اللايقين الموسع | number | Expanded uncertainty at 95% confidence (MPa) | اللايقين الموسع عند ثقة 95% (MPa) |

### Specimen Result Fields | حقول نتيجة العينة

| Field | الحقل | Type | Description | الوصف |
|-------|-------|------|-------------|-------|
| `failureLoadN` | حمل الإنهيار (N) | number | Failure load in Newtons | حمل الإنهيار بالنيوتن |
| `areaMm2` | المساحة | number | Specimen area (mm²) | مساحة العينة (مم²) |
| `tensileStrengthMPa` | إجهاد التماسك | number | **Tensile adhesion strength (MPa)** | **إجهاد التماسك (MPa)** |

---

## Example | مثال

### Request

```bash
curl -X POST http://localhost:3000/api/pulloff/calculate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "specimens": [
      {"diameterMm": 55, "failureLoadKN": 3.63},
      {"diameterMm": 55, "failureLoadKN": 2.87},
      {"diameterMm": 49.5, "failureLoadKN": 3.25},
      {"diameterMm": 55, "failureLoadKN": 3.31},
      {"diameterMm": 55, "failureLoadKN": 4.08},
      {"diameterMm": 55, "failureLoadKN": 4.59}
    ]
  }'
```

### Response

```json
{
  "results": [
    {"diameterMm": 55, "failureLoadKN": 3.63, "tensileStrengthMPa": 1.528},
    {"diameterMm": 55, "failureLoadKN": 2.87, "tensileStrengthMPa": 1.208},
    {"diameterMm": 49.5, "failureLoadKN": 3.25, "tensileStrengthMPa": 1.689},
    {"diameterMm": 55, "failureLoadKN": 3.31, "tensileStrengthMPa": 1.393},
    {"diameterMm": 55, "failureLoadKN": 4.08, "tensileStrengthMPa": 1.717},
    {"diameterMm": 55, "failureLoadKN": 4.59, "tensileStrengthMPa": 1.932}
  ],
  "averageStrength": 1.578,
  "minimumStrength": 1.208,
  "maximumStrength": 1.932,
  "standardDeviation": 0.272,
  "coefficientOfVariation": 17.23,
  "expandedUncertaintyMPa": 0.352
}
```

---

# 3. اختبار مطرقة الإرتداد | Schmidt Hammer Test

**Endpoint:** `POST /api/schmidt/calculate/batch`

اختبار غير إتلافي لتقدير صلادة سطح الخرسانة باستخدام مطرقة Schmidt.

Non-destructive test to estimate surface hardness of concrete using Schmidt (Rebound) Hammer.

## Request Body

```json
{
  "elements": [
    {
      "elementName": "بلاطة خرسانية - Concrete slab",
      "elementCode": "MTL/IT/S/2024/84",
      "hammerDirection": "downward",
      "readings": [42, 42, 42, 42, 40, 42, 43, 43, 41, 44, 42, 42, 43, 41, 40],
      "notes": "ملاحظات - Notes"
    }
  ],
  "anvilCalibration": {
    "readingsBefore": [81, 83, 84, 84, 83],
    "readingsAfter": [80, 80, 82, 82, 81]
  },
  "hammerCode": "4012",
  "client": "اسم العميل - Client Name",
  "project": "اسم المشروع - Project Name",
  "testingDate": "2024-06-04",
  "ambientTemperature": "29°C"
}
```

### Request Fields | حقول الطلب

| Field | الحقل | Type | Required | Description | الوصف |
|-------|-------|------|----------|-------------|-------|
| `elements` | العناصر | array | ✅ Yes | Array of tested elements | مصفوفة العناصر المختبرة |
| `anvilCalibration` | معايرة السندان | object | ✅ Yes | Anvil calibration readings | قراءات معايرة السندان |
| `hammerCode` | كود المطرقة | string | ❌ No | Hammer code/number | كود/رقم المطرقة |
| `client` | العميل | string | ❌ No | Client name | اسم الجهة طالبة الاختبار |
| `project` | المشروع | string | ❌ No | Project name | اسم المشروع |
| `testingDate` | تاريخ الاختبار | string | ❌ No | Testing date | تاريخ إجراء الاختبار |
| `ambientTemperature` | درجة الحرارة | string | ❌ No | Ambient temperature | درجة حرارة الجو |

### Element Fields | حقول العنصر

| Field | الحقل | Type | Required | Description | الوصف |
|-------|-------|------|----------|-------------|-------|
| `readings` | القراءات | number[] | ✅ Yes | 9-15 rebound readings | 9-15 قراءة إرتداد |
| `elementName` | اسم العنصر | string | ❌ No | Structural element name | اسم العنصر الإنشائي |
| `elementCode` | كود العنصر | string | ❌ No | Element code | كود العنصر |
| `hammerDirection` | اتجاه المطرقة | string | ❌ No | `"horizontal"` / `"downward"` / `"upward"` | أفقي / لأسفل / لأعلى |
| `notes` | ملاحظات | string | ❌ No | Notes | ملاحظات |

### Anvil Calibration Fields | حقول معايرة السندان

| Field | الحقل | Type | Required | Description | الوصف |
|-------|-------|------|----------|-------------|-------|
| `readingsBefore` | قراءات قبل | number[] | ✅ Yes | Readings before test (min 5) | قراءات قبل الاختبار (5 على الأقل) |
| `readingsAfter` | قراءات بعد | number[] | ✅ Yes | Readings after test (min 5) | قراءات بعد الاختبار (5 على الأقل) |

---

## Response Body

```json
{
  "results": [
    {
      "elementName": "بلاطة خرسانية",
      "elementCode": "MTL/IT/S/2024/84",
      "hammerDirection": "downward",
      "originalReadings": [42, 42, 42, 42, 40, 42, 43, 43, 41, 44, 42, 42, 43, 41, 40],
      "correctedReadings": [40.98, 40.98, 40.98, 40.98, 39.02, 40.98, 41.95, 41.95, 40, 42.93, 40.98, 40.98, 41.95, 40, 39.02],
      "medianRebound": 41,
      "lowerLimit": 30.75,
      "upperLimit": 51.25,
      "validReadingsCount": 15,
      "standardDeviation": 1.07,
      "uncertainty": {
        "repeatabilityUncertainty": 0.277,
        "resolutionUncertainty": 0.577,
        "calibrationUncertainty": 0.0133,
        "combinedUncertainty": 0.64,
        "coverageFactor": 2,
        "expandedUncertainty": 1.28
      },
      "expandedUncertainty": 1.28,
      "approximateStrengthKgCm2": 485
    }
  ],
  "correctionFactorRSA": 0.9756,
  "anvilMedian": 82,
  "hammerCode": "4012",
  "testingDate": "2024-06-04"
}
```

### Response Fields | حقول الاستجابة

| Field | الحقل | Type | Description | الوصف |
|-------|-------|------|-------------|-------|
| `results` | النتائج | array | Individual element results | نتائج العناصر الفردية |
| `correctionFactorRSA` | معامل التصحيح | number | RSA correction factor (80/median) | معامل تصحيح السندان (80/الوسيط) |
| `anvilMedian` | وسيط السندان | number | Median of anvil readings | وسيط قراءات السندان |
| `hammerCode` | كود المطرقة | string | Hammer code | كود المطرقة |
| `testingDate` | تاريخ الاختبار | string | Testing date | تاريخ الاختبار |

### Element Result Fields | حقول نتيجة العنصر

| Field | الحقل | Type | Description | الوصف |
|-------|-------|------|-------------|-------|
| `originalReadings` | القراءات الأصلية | number[] | Original rebound readings | القراءات الأصلية |
| `correctedReadings` | القراءات المصححة | number[] | Corrected readings (× RSA) | القراءات المصححة (× RSA) |
| `medianRebound` | الوسيط | number | **Median of corrected readings** | **وسيط القراءات المصححة** |
| `lowerLimit` | الحد الأدنى | number | Lower acceptance limit (0.75 × median) | الحد الأدنى للقبول |
| `upperLimit` | الحد الأعلى | number | Upper acceptance limit (1.25 × median) | الحد الأعلى للقبول |
| `validReadingsCount` | القراءات الصالحة | number | Count of valid readings | عدد القراءات المقبولة |
| `standardDeviation` | الانحراف المعياري | number | Standard deviation | الانحراف المعياري |
| `expandedUncertainty` | اللايقين الموسع | number | Expanded uncertainty at 95% confidence (±) | اللايقين الموسع عند ثقة 95% (±) |
| `approximateStrengthKgCm2` | المقاومة التقريبية | number | Approximate compressive strength (kg/cm²) - Indicative only | مقاومة الضغط التقريبية (كجم/سم²) - للاسترشاد فقط |

---

## Example | مثال

### Request

```bash
curl -X POST http://localhost:3000/api/schmidt/calculate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "elements": [
      {
        "elementName": "عمود C1",
        "readings": [42, 44, 40, 38, 42, 44, 40, 38, 42, 44, 40, 38, 41, 43, 39]
      },
      {
        "elementName": "كمرة B1",
        "readings": [38, 40, 36, 34, 38, 40, 36, 34, 38, 40, 36, 34, 37, 39, 35]
      }
    ],
    "anvilCalibration": {
      "readingsBefore": [82, 83, 82, 82, 83],
      "readingsAfter": [82, 83, 82, 83, 82]
    }
  }'
```

### Response

```json
{
  "results": [
    {
      "elementName": "عمود C1",
      "medianRebound": 40,
      "validReadingsCount": 15,
      "expandedUncertainty": 1.60,
      "approximateStrengthKgCm2": 460
    },
    {
      "elementName": "كمرة B1",
      "medianRebound": 37,
      "validReadingsCount": 15,
      "expandedUncertainty": 1.18,
      "approximateStrengthKgCm2": 385
    }
  ],
  "correctionFactorRSA": 0.9756,
  "anvilMedian": 82
}
```

---

# شرح مبسط لاختبار مطرقة الإرتداد | Schmidt Hammer Test Explained

## الفكرة الأساسية | Basic Concept

تخيل إنك بتضرب الحيطة بإيدك... لو الحيطة صلبة، إيدك هترتد بسرعة. لو الحيطة ضعيفة، إيدك مش هترتد بنفس القوة.

Imagine hitting a wall with your hand... if the wall is hard, your hand bounces back quickly. If it's soft, your hand doesn't bounce back as much.

```
    ╔═══════════════╗
    ║   المطرقة    ║
    ║  ┌─────────┐  ║
    ║  │ زنبرك  │  ║  ← Spring (زنبرك)
    ║  │   ↓↑   │  ║
    ║  └────●────┘  ║  ← Metal plunger (مسمار معدني)
    ╚═══════════════╝
          ↓
    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← Concrete surface (سطح الخرسانة)
```

## معامل التصحيح RSA | RSA Correction Factor

```
RSA = 80 ÷ Median(anvil readings)
معامل التصحيح = 80 ÷ وسيط(قراءات السندان)
```

## نطاق القبول | Acceptance Range

```
Lower Limit = 0.75 × Median    الحد الأدنى = 0.75 × الوسيط
Upper Limit = 1.25 × Median    الحد الأعلى = 1.25 × الوسيط
```

## ملاحظات هامة | Important Notes

- الاختبار يعطي نتائج استرشادية لمقاومة الضغط
- This test provides indicative compressive strength results
- لا يعتد بها طبقا للكود المصرى رقم 203 لسنة 2020
- Not accepted per ECP 203-2020 for structural evaluation
- يمكن الإسترشاد بها للمقارنات أو مع نتائج القلب الخرساني
- Can be used for comparison or in conjunction with core test results

---

# المواصفات المرجعية | Reference Standards

| الاختبار (Test) | المواصفة (Standard) |
|-----------------|---------------------|
| اختبار القلب الخرساني (Core Test) | ECP 203-2020, BS EN 12504-1, ASTM C42 |
| اختبار الإقتلاع (Pull-Off Test) | BS 1881-Part 207-1992 |
| اختبار مطرقة الإرتداد (Schmidt Hammer) | EN 12504-2-2021 |

---

# الوحدات المستخدمة | Units Used

| الخاصية (Property) | الوحدة (Unit) |
|--------------------|---------------|
| القطر (Diameter) | مم (mm) |
| الطول (Length) | مم (mm) |
| حمل الكسر (Breaking Load) | كيلو نيوتن (kN) |
| الكثافة (Density) | جم/سم³ (g/cm³) |
| المقاومة (Strength) | كجم/سم² (kg/cm²) |
| المقاومة (Strength) | ميجا باسكال (MPa) |

---

# ملخص الـ Endpoints | Endpoints Summary

| Endpoint | Method | الوصف (Description) |
|----------|--------|---------------------|
| `/api/calculate/batch` | POST | حساب مجموعة عينات قلب خرساني (Batch core samples calculation) |
| `/api/pulloff/calculate/batch` | POST | حساب مجموعة عينات إقتلاع (Batch pull-off specimens calculation) |
| `/api/schmidt/calculate/batch` | POST | حساب اختبار مطرقة الإرتداد (Schmidt hammer batch calculation) |
| `/api/health` | GET | فحص حالة الخادم (Health check) |
| `/api-docs` | GET | توثيق Swagger التفاعلي (Interactive Swagger documentation) |

---

# للمزيد من المعلومات | For More Information

افتح متصفح الويب على: `http://localhost:3000/api-docs`

Open your web browser at: `http://localhost:3000/api-docs`

ستجد توثيق Swagger الكامل مع أمثلة تفاعلية لجميع الاختبارات.

You will find complete Swagger documentation with interactive examples for all tests.
