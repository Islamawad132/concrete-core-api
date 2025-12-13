# حاسبة اختبار القلب الخرساني 🏗️

API لحساب مقاومة الضغط المستنبطة للمكعب الخرساني من عينات القلب.

## التشغيل

```bash
npm install
npm run dev
```

📍 **Swagger UI**: http://localhost:3000/api-docs

---

## المدخلات

| الحقل | الوصف | مثال |
|-------|-------|------|
| `diameters` | قطر العينة (قياسين) مم | `[93, 93]` |
| `lengths` | طول العينة (2-3 قياسات) مم | `[122, 120, 122]` |
| `weightGrams` | الوزن بالجرام | `1835` |
| `density` | الكثافة جم/سم³ | `2.5` |
| `breakingLoadKN` | حمل الكسر كيلو نيوتن | `68.4` |
| `aggregateCondition` | حالة الرطوبة | `"dry"` / `"natural"` / `"saturated"` |
| `reinforcement` | حديد التسليح (اختياري) | `[{"diameterMm": 8, "distanceFromEndMm": 43}]` |

---

## المخرجات

| الحقل | الوصف |
|-------|-------|
| `coreStrength` | مقاومة الضغط للقلب (كجم/سم²) |
| `cuttingCorrectionFactor` | معامل Fg (محسوب تلقائياً) |
| `equivalentCubeStrength` | **المقاومة المستنبطة للمكعب** (كجم/سم²) |

---

## أمثلة عملية

### 1️⃣ خارجي قلب خرساني

```bash
curl -X POST http://localhost:3000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "diameters": [93, 93],
    "lengths": [122, 120, 122],
    "weightGrams": 1835,
    "density": 2.5,
    "breakingLoadKN": 68.4,
    "aggregateCondition": "dry"
  }'
```

**النتيجة**: `coreStrength: 100.69` | `equivalentCubeStrength: 120.31`

---

### 2️⃣ بردورات قلب خرساني

```bash
curl -X POST http://localhost:3000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "diameters": [68, 68],
    "lengths": [82, 83, 82],
    "weightGrams": 686,
    "density": 2.5,
    "breakingLoadKN": 34.3,
    "aggregateCondition": "natural"
  }'
```

**النتيجة**: `coreStrength: 94.44` | `equivalentCubeStrength: 117.59`

---

### 3️⃣ مورد قلب خرساني

```bash
curl -X POST http://localhost:3000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "diameters": [93, 93],
    "lengths": [110, 112, 110],
    "weightGrams": 1786,
    "density": 2.3,
    "breakingLoadKN": 234.9,
    "aggregateCondition": "dry"
  }'
```

**النتيجة**: `coreStrength: 345.79` | `equivalentCubeStrength: 347.63`

---

## حساب مجموعة عينات

```bash
curl -X POST http://localhost:3000/api/calculate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "samples": [
      {"diameters": [93,93], "lengths": [122,120,122], "weightGrams": 1835, "density": 2.5, "breakingLoadKN": 68.4, "aggregateCondition": "dry"},
      {"diameters": [93,93], "lengths": [116,116,115], "weightGrams": 1770, "density": 2.5, "breakingLoadKN": 63.6, "aggregateCondition": "dry"},
      {"diameters": [93,93], "lengths": [112,114,113], "weightGrams": 1433, "density": 2.5, "breakingLoadKN": 32.8, "aggregateCondition": "dry"}
    ]
  }'
```

---

## جداول المعاملات

| Endpoint | الوصف |
|----------|-------|
| `GET /api/reference/fg-correction` | جدول معامل القطع Fg |
| `GET /api/reference/moisture-correction` | جدول معامل الرطوبة Fm |
| `GET /api/reference/fg-factor/93/10` | حساب Fg لقطر ومقاومة محددة |

---

## معادلة الحساب

```
المقاومة المستنبطة = مقاومة القلب × Fm × Fg × (الكثافة ÷ (1.5 + قطر/طول)) × معامل التسليح
```

| المعامل | القيمة |
|---------|--------|
| **Fm** (جافة) | 0.96 |
| **Fm** (طبيعية) | 1.00 |
| **Fm** (مشبعة) | 1.05 |
| **Fg** | محسوب من جدول الـ interpolation |
