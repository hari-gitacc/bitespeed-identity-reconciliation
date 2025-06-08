// src/validators/identifyValidator.ts
import Joi from 'joi';

export const identifySchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .lowercase()
    .trim()
    .optional(),
  phoneNumber: Joi.alternatives().try(
    Joi.string().pattern(/^[0-9]{1,15}$/),
    Joi.number().integer().min(0).max(999999999999999)
  ).optional()
}).or('email', 'phoneNumber');