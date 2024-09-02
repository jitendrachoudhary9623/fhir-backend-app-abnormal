import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import jose from 'node-jose';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { apiRouter } from './routes';
import { swaggerSpec } from './config/swagger';
import { startScheduler } from './utils/scheduler';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// JWKS endpoint
app.get('/jwks', async (req, res) => {
  const ks = fs.readFileSync('keys/keys.json')
  const keyStore = await jose.JWK.asKeyStore(ks.toString())
  res.json(keyStore.toJSON())
});

// Routes
app.use('/api', apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start scheduler
startScheduler();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
  console.log(`JWKS endpoint is available at http://localhost:${port}/jwks`);
});

export default app;