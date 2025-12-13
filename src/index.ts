import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Concrete Core Calculator API - حاسبة القلب الخرساني',
}));

// API routes
app.use('/api', routes);

// Root redirect to docs
app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Concrete Core Test Calculator API - حاسبة القلب الخرساني    ║
╠════════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                      ║
║  Swagger docs at:   http://localhost:${PORT}/api-docs              ║
╠════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                    ║
║  - POST /api/calculate        - Single core calculation        ║
║  - POST /api/calculate/batch  - Batch calculation              ║
║  - GET  /api/reference/*      - Reference tables               ║
║  - GET  /api/health           - Health check                   ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
