import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, JWTPayload } from "./jwt";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware to protect routes - requires valid JWT token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Token manquant. Authentification requise." });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify token
    const payload = verifyAccessToken(token);
    
    // Attach user info to request
    req.user = payload;
    
    next();
  } catch (error: any) {
    res.status(401).json({ 
      error: "Token invalide ou expiré", 
      message: error.message 
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      req.user = payload;
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}
