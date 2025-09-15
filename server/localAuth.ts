import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import type { Express } from "express";

export function setupLocalAuth(app: Express) {
  // Configure local strategy for username/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      async (username: string, password: string, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          if (!user) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          const isValidPassword = await storage.validatePassword(user, password);
          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          // Check if user is active
          if (!user.isActive) {
            return done(null, false, { message: 'Account is disabled' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

}

// Middleware to check if user is authenticated for local auth
export const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};

// Middleware to check if user has admin role
export const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};