// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import { identify } from './controllers/identityController';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';



// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /identify:
 *   post:
 *     summary: Identify and reconcile customer contact
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: mcfly@hillvalley.edu
 *               phoneNumber:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contact:
 *                   type: object
 *                   properties:
 *                     primaryContatctId:
 *                       type: integer
 *                       example: 1
 *                     emails:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"]
 *                     phoneNumbers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["123456"]
 *                     secondaryContactIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [23]
 *             example:
 *               contact:
 *                 primaryContatctId: 1
 *                 emails: ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"]
 *                 phoneNumbers: ["123456"]
 *                 secondaryContactIds: [23]
 */


// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Main endpoint
app.post('/identify', (req, res, next) => {
    identify(req, res, next).catch(next);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 Identity endpoint: POST http://localhost:${PORT}/identify`);
});