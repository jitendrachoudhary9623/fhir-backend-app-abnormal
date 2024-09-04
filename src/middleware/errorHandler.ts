import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message);

  console.log(err.response)
  console.log(err.response.data)

  console.log(err.data)

  res.status(500).json({
    message: 'Internal Server Error',
  });
};