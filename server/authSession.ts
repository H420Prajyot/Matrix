import passport from "passport";
import { storage } from "./storage";
import * as client from "openid-client";
import memoize from "memoizee";

// Define session data types for different auth methods
export interface OIDCSessionData {
  type: 'oidc';
  claims: any;
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface LocalSessionData {
  type: 'local';
  userId: string;
}

export type AuthSessionData = OIDCSessionData | LocalSessionData;

/**
 * Unified passport serialization that handles both OIDC and local authentication
 */
export function setupUnifiedPassportSerialization() {
  // Serialize user for session storage
  passport.serializeUser((user: any, done) => {
    try {
      // Detect authentication type based on user object properties
      if (user.claims && user.access_token) {
        // OIDC user - store token data
        const sessionData: OIDCSessionData = {
          type: 'oidc',
          claims: user.claims,
          access_token: user.access_token,
          refresh_token: user.refresh_token,
          expires_at: user.expires_at
        };
        done(null, sessionData);
      } else if (user.id) {
        // Local user - store only user ID
        const sessionData: LocalSessionData = {
          type: 'local',
          userId: user.id
        };
        done(null, sessionData);
      } else {
        // Unknown user type
        done(new Error('Unknown user type for serialization'), null);
      }
    } catch (error) {
      done(error, null);
    }
  });

  // Deserialize user from session storage
  passport.deserializeUser(async (sessionData: AuthSessionData, done) => {
    try {
      if (sessionData.type === 'oidc') {
        // OIDC user - reconstruct user object with token data
        const user = {
          claims: sessionData.claims,
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
          expires_at: sessionData.expires_at
        };
        done(null, user);
      } else if (sessionData.type === 'local') {
        // Local user - fetch from database
        const user = await storage.getUser(sessionData.userId);
        if (!user) {
          return done(new Error('User not found'), null);
        }
        done(null, user);
      } else {
        done(new Error('Unknown session data type'), null);
      }
    } catch (error) {
      done(error, null);
    }
  });
}

/**
 * Helper function to create OIDC user object for passport
 */
export function createOIDCUser(tokens: any): any {
  return {
    claims: tokens.claims(),
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.claims()?.exp
  };
}

/**
 * Get OIDC configuration (memoized)
 */
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

/**
 * Update user session with new OIDC tokens
 */
function updateUserSession(user: any, tokenResponse: any): void {
  // Update the user object in-place with new token data
  const newClaims = tokenResponse.claims();
  user.claims = newClaims;
  user.access_token = tokenResponse.access_token;
  if (tokenResponse.refresh_token) {
    user.refresh_token = tokenResponse.refresh_token;
  }
  user.expires_at = newClaims?.exp;
}

/**
 * Helper function to get user ID from authenticated request
 * Works for both OIDC and local auth
 */
export function getUserId(req: any): string | null {
  if (!req.user) return null;
  
  // OIDC user
  if (req.user.claims?.sub) {
    return req.user.claims.sub;
  }
  
  // Local user
  if (req.user.id) {
    return req.user.id;
  }
  
  return null;
}

/**
 * Helper function to check if current user is OIDC authenticated
 */
export function isOIDCAuth(req: any): boolean {
  return req.user?.claims && req.user?.access_token;
}

/**
 * Helper function to check if current user is locally authenticated
 */
export function isLocalAuth(req: any): boolean {
  return req.user?.id && req.user?.username;
}

/**
 * Unified authentication middleware that works for both OIDC and local auth
 */
export const unifiedIsAuthenticated = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user;

  // Handle OIDC authentication
  if (user.claims && user.access_token) {
    if (!user.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    // Token expired, try to refresh
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return next();
    } catch (error) {
      console.error('OIDC token refresh failed:', error);
      return res.status(401).json({ message: "Session expired" });
    }
  }

  // Handle local authentication - no expiration check needed
  if (user.id) {
    return next();
  }

  // Unknown user type
  return res.status(401).json({ message: "Unauthorized" });
};