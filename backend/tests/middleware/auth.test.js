import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, setSessionCookie, SESSION_COOKIE_NAME } from '@backend/middleware/auth.js';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
function createMockReq(overrides = {}) {
    return {
        headers: {},
        user: undefined,
        ...overrides,
    };
}
function createMockRes() {
    const res = {
        cookies: {},
        statusCode: undefined,
        jsonBody: undefined,
        status(code) { res.statusCode = code; return res; },
        json(data) { res.jsonBody = data; return res; },
        cookie(name, value, options) { res.cookies[name] = { value, options }; return res; },
        clearCookie(name, options) { delete res.cookies[name]; return res; },
    };
    return res;
}
describe('signToken', () => {
    it('creates a valid JWT', () => {
        const user = { id: 1, email: 'test@test.com', role: 'admin' };
        const token = signToken(user);
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.id).toBe(1);
        expect(decoded.email).toBe('test@test.com');
        expect(decoded.role).toBe('admin');
    });
    it('includes team_id for team role', () => {
        const user = { team_id: 5, team_slug: 'los-pollitos', name: 'Los Pollitos', role: 'team' };
        const token = signToken(user);
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.team_id).toBe(5);
        expect(decoded.team_slug).toBe('los-pollitos');
    });
    it('includes anonymous_id for judge role', () => {
        const user = { id: 3, anonymous_id: 'j123', role: 'judge' };
        const token = signToken(user);
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.anonymous_id).toBe('j123');
    });
});
describe('setSessionCookie', () => {
    it('sets cookie with correct name and httpOnly', () => {
        const res = createMockRes();
        setSessionCookie(res, 'test-token');
        expect(res.cookies[SESSION_COOKIE_NAME]).toBeDefined();
        expect(res.cookies[SESSION_COOKIE_NAME].value).toBe('test-token');
        expect(res.cookies[SESSION_COOKIE_NAME].options.httpOnly).toBe(true);
    });
    it('sets sameSite to strict', () => {
        const res = createMockRes();
        setSessionCookie(res, 'test-token');
        expect(res.cookies[SESSION_COOKIE_NAME].options.sameSite).toBe('strict');
    });
});
describe('parseCookies (via auth middleware)', () => {
    it('extracts token from cookie header', async () => {
        const { authMiddleware } = await import('@backend/middleware/auth.js');
        const user = { id: 1, email: 'test@test.com', role: 'admin' };
        const token = signToken(user);
        const req = createMockReq({
            headers: { cookie: `session_token=${token}` },
        });
        const res = createMockRes();
        const next = vi.fn();
        authMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.role).toBe('admin');
    });
    it('extracts token from Authorization header', async () => {
        const { authMiddleware } = await import('@backend/middleware/auth.js');
        const user = { id: 1, email: 'test@test.com', role: 'admin' };
        const token = signToken(user);
        const req = createMockReq({
            headers: { authorization: `Bearer ${token}` },
        });
        const res = createMockRes();
        const next = vi.fn();
        authMiddleware(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user.role).toBe('admin');
    });
    it('returns 401 when no token provided', async () => {
        const { authMiddleware } = await import('@backend/middleware/auth.js');
        const req = createMockReq({ headers: {} });
        const res = createMockRes();
        const next = vi.fn();
        authMiddleware(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(401);
    });
    it('returns 401 for invalid token', async () => {
        const { authMiddleware } = await import('@backend/middleware/auth.js');
        const req = createMockReq({
            headers: { cookie: 'session_token=invalid-token' },
        });
        const res = createMockRes();
        const next = vi.fn();
        authMiddleware(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(401);
    });
});
describe('requireRole', () => {
    it('calls next when user has matching role', async () => {
        const { requireRole } = await import('@backend/middleware/auth.js');
        const req = createMockReq({ user: { role: 'admin' } });
        const res = createMockRes();
        const next = vi.fn();
        requireRole('admin')(req, res, next);
        expect(next).toHaveBeenCalled();
    });
    it('returns 403 when user role does not match', async () => {
        const { requireRole } = await import('@backend/middleware/auth.js');
        const req = createMockReq({ user: { role: 'team' } });
        const res = createMockRes();
        const next = vi.fn();
        requireRole('admin')(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });
    it('returns 403 when no user', async () => {
        const { requireRole } = await import('@backend/middleware/auth.js');
        const req = createMockReq();
        const res = createMockRes();
        const next = vi.fn();
        requireRole('admin')(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });
    it('accepts multiple roles', async () => {
        const { requireRole } = await import('@backend/middleware/auth.js');
        const req = createMockReq({ user: { role: 'judge' } });
        const res = createMockRes();
        const next = vi.fn();
        requireRole('admin', 'judge')(req, res, next);
        expect(next).toHaveBeenCalled();
    });
});
