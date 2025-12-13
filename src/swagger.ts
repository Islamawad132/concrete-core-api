import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Concrete Core Test Calculator API',
      version: '1.0.0',
      description: `
# حاسبة اختبار القلب الخرساني
## Concrete Core Test Calculator

This API implements the calculations from the Egyptian National Building Research Center 
(المركز القومي لبحوث الاسكان و البناء) for testing concrete core samples.

## Overview

The concrete core test is a destructive testing method used to evaluate the in-situ 
compressive strength of hardened concrete. A cylindrical sample (core) is drilled from 
the structure and tested under compression to determine the equivalent cube strength.

## Calculation Process

### 1. Core Strength Calculation (مقاومة الضغط للقلب)
\`\`\`
Core Strength (kg/cm²) = (Breaking Load × 1000 × 4/π × 100) / diameter²
\`\`\`
Where:
- Breaking Load is in tons (طن)
- Diameter is in mm (مم)

### 2. Correction Factors Applied

#### a) Moisture Correction Factor (Fm) - عامل تأثير درجة رطوبة القلب
| Condition | Arabic | Factor |
|-----------|--------|--------|
| Dry | جافة | 0.96 |
| Natural | طبيعية | 1.00 |
| Saturated | مشبعة | 1.05 |

#### b) Cutting Correction Factor (Fg) - عامل تأثير عملية القطع
Default value: **1.12** (accounts for damage during core extraction)

#### c) L/D Ratio Correction - تصحيح نسبة الطول للقطر
When L/D ratio differs from 2.0, a correction is applied:

| L/D Ratio | Correction Factor |
|-----------|------------------|
| 1.5 | 1.07 |
| 2.0 | 1.05 |
| 2.5 | 1.04 |
| 3.0 | 1.03 |
| 3.5 | 1.02 |

Intermediate values are calculated using linear interpolation.

#### d) Reinforcement Correction
If steel reinforcement bars are present in the core:
\`\`\`
Factor = 1 + 1.5 × Σ(bar_diameter × distance_from_end) / (core_diameter × core_length)
\`\`\`

### 3. Equivalent Cube Strength (مقاومة الضغط المستنبطة للمكعب)
\`\`\`
Equivalent Cube Strength = Core Strength × Fm × Fg × (ρ / (1.5 + D/L)) × Reinforcement Factor
\`\`\`
Where:
- ρ = Concrete density (g/cm³)
- D = Average diameter (mm)
- L = Average length (mm)

## Standards Reference

- **ECP 203-2020**: Egyptian Code for Design and Construction of Concrete Structures
- **BS EN 12504-1**: Testing concrete in structures - Cored specimens
- **ASTM C42**: Standard Test Method for Obtaining and Testing Drilled Cores

## Units

| Property | Unit (SI) | Unit (Arabic) |
|----------|-----------|---------------|
| Diameter | mm | مم |
| Length | mm | مم |
| Breaking Load | tons | طن |
| Density | g/cm³ | جم/سم³ |
| Strength | kg/cm² | كجم/سم² |
| Strength (SI) | MPa | ميجا باسكال |

## Typical Values

- **Core diameter**: 75-150 mm (standard is 100 mm)
- **L/D ratio**: Ideally 2.0 (1.0-2.0 acceptable)
- **Concrete density**: 2.3-2.5 g/cm³ for normal concrete
- **Expected strength**: Depends on concrete grade (e.g., C25/30, C30/37)
      `,
      contact: {
        name: 'Building Materials & Quality Control Research Institute',
        email: 'info@hbrc.edu.eg',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Calculations',
        description: 'Core strength calculation endpoints',
      },
      {
        name: 'Reference',
        description: 'Reference tables and correction factors',
      },
    ],
  },
  apis: ['./src/routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
