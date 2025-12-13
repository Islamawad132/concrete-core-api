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
  customSiteTitle: 'معهد بحوث مواد البناء و ضبط الجودة - API',
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
╔══════════════════════════════════════════════════════════════════════╗
║     المركز القومي لبحوث الاسكان والبناء - HBRC                         ║
║     معهد بحوث مواد البناء و ضبط الجودة                                ║
╠══════════════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                            ║
║  Swagger docs at:   http://localhost:${PORT}/api-docs                    ║
╠══════════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                          ║
║  - POST /api/calculate/batch         - Core Test (اختبار القلب)        ║
║  - POST /api/pulloff/calculate/batch - Pull-Off Test (اختبار الإقتلاع) ║
║  - GET  /api/health                  - Health check                  ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
