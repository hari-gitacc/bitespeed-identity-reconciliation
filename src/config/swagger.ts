// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bitespeed Identity Reconciliation API',
      version: '1.0.0',
      description: 'API for linking customer identities across multiple purchases',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://bitespeed-identity-reconciliation-j0i8.onrender.com'
          : 'http://localhost:3000',
      },
    ],
  },
  apis: ['./src/app.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);