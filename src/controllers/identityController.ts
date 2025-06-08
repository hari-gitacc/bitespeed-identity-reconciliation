// src/controllers/identityController.ts
import { Request, Response, NextFunction } from 'express';
import { IdentityService } from '../services/identityService';
import { identifySchema } from '../validators/identifyValidator';

const identityService = new IdentityService();

export const identify = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<Response | void> => {
    try {
        // Validate request
        const { error, value } = identifySchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message,
            });
        }

        // Call service
        const result = await identityService.identify(value);

        return res.status(200).json(result);
    } catch (error) {
        next(error); // Pass to error handler middleware
    }
};