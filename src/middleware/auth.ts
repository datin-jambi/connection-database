import { Request, Response, NextFunction } from 'express';
import config from '../config/env';
import logger from '../utils/logger';

export const corsWhitelist = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  
  if (!origin) {
    // Allow requests with no origin (like mobile apps or curl)
    next();
    return;
  }
  
  if (config.allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
  } else {
    logger.warn(`Blocked request from unauthorized origin: ${origin}`);
    res.status(403).json({
      success: false,
      error: 'Origin not allowed',
      message: 'Your origin is not whitelisted to access this service',
    });
  }
};

export const apiKeyValidator = (req: Request, res: Response, next: NextFunction): void => {
  // Skip API key validation if no keys are configured
  if (config.apiKeys.length === 0) {
    next();
    return;
  }
  
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    logger.warn('Request without API key');
    res.status(401).json({
      success: false,
      error: 'API key required',
      message: 'Please provide X-API-Key header',
    });
    return;
  }
  
  if (config.apiKeys.includes(apiKey)) {
    next();
  } else {
    logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
    res.status(403).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
    });
  }
};
