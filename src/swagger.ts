import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'معهد بحوث مواد البناء و ضبط الجودة - API',
      version: '1.0.0',
      description: `
# المركز القومي لبحوث الاسكان والبناء
## Housing and Building National Research Center (HBRC)

### معهد بحوث مواد البناء و ضبط الجودة
### Building Materials Research & Quality Control Institute

#### معمل الخرسانة | Concrete Laboratory

---

## الاختبارات المتاحة | Available Tests

### 1. اختبار القلب الخرساني (Concrete Core Test)
اختبار مقاومة الضغط للخرسانة المتصلدة عن طريق استخراج عينات أسطوانية من المنشأ.

**المعادلة الأساسية:**
\`\`\`
مقاومة المكعب المكافئ = مقاومة القلب × Fm × Fg × (ρ / (1.5 + D/L)) × معامل التسليح
\`\`\`

**المواصفات المرجعية:**
- ECP 203-2020 (الكود المصري)
- BS EN 12504-1
- ASTM C42

---

### 2. اختبار الإقتلاع (Pull-Off Test) - تماسك طبقتين
اختبار قوة التماسك بين طبقتين من الخرسانة أو بين طبقة خرسانية ومادة لاصقة.

**المعادلة الأساسية:**
\`\`\`
إجهاد التماسك (MPa) = حمل الإنهيار (N) ÷ مساحة القرص (mm²)
المساحة = π × (القطر ÷ 2)²
\`\`\`

**المواصفة المرجعية:**
- BS 1881-Part 207-1992

---

## الوحدات | Units

| الخاصية | الوحدة | Property | Unit |
|---------|--------|----------|------|
| القطر | مم | Diameter | mm |
| الطول | مم | Length | mm |
| حمل الكسر | كيلو نيوتن | Breaking Load | kN |
| الكثافة | جم/سم³ | Density | g/cm³ |
| المقاومة | كجم/سم² | Strength | kg/cm² |
| المقاومة | ميجا باسكال | Strength | MPa |
      `,
      contact: {
        name: 'معهد بحوث مواد البناء و ضبط الجودة',
        url: 'https://www.hbrc.edu.eg',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: process.env.API_URL ? 'Production server' : 'Development server',
      },
    ],
    tags: [
      {
        name: 'Core Test - اختبار القلب الخرساني',
        description: 'حساب مقاومة الضغط للقلب الخرساني | Concrete core strength calculations',
      },
      {
        name: 'Pull-Off Test - اختبار الإقتلاع',
        description: 'حساب مقاومة التماسك | Tensile adhesion strength calculations (BS 1881-207)',
      },
      {
        name: 'Schmidt Hammer - اختبار مطرقة الإرتداد',
        description: 'اختبار صلادة السطح | Surface hardness test using rebound hammer (EN 12504-2-2021)',
      },
    ],
  },
  apis: ['./src/routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
