import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id?: number;
    team_id?: number;
    anonymous_id?: string;
    email?: string;
    role: 'admin' | 'team' | 'judge' | 'guest';
    name?: string;
}
export interface AuthRequest extends Request {
    user?: AuthUser;
}
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireRole(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
