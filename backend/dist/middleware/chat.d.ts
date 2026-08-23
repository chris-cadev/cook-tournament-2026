import { Request, Response, NextFunction } from 'express';
export declare function validateChannelAccess(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
