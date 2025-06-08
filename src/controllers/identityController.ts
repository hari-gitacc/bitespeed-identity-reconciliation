// src/controllers/identityController.ts
import { Request, Response } from 'express';
import { IdentityService } from '../services/identityService';
import { IdentifyRequest } from '../types';

const identityService = new IdentityService();

export const identify = async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body as IdentifyRequest;

    // Basic validation
    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: 'Either email or phoneNumber must be provided',
      });
    }

    // Convert phoneNumber to string if it's a number
    const processedData: IdentifyRequest = {
      email: email || undefined,
      phoneNumber: phoneNumber ? String(phoneNumber) : undefined,
    };

    const result = await identityService.identify(processedData);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in identify endpoint:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
};