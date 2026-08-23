import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare function validateChannelAccess(req: AuthRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
