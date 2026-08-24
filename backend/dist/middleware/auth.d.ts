import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id?: number;
    email?: string;
    team_id?: number;
    name?: string;
    anonymous_id?: string;
    role: 'admin' | 'team' | 'judge' | 'guest';
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireRole(...roles: string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function signToken(payload: AuthUser): string;
