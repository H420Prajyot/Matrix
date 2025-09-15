import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { createOIDCUser } from "./authSession";

// Extend the session interface to include intendedRole
declare module 'express-session' {
  interface SessionData {
    intendedRole?: 'admin' | 'pentester' | 'client';
  }
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}


async function upsertUser(
  claims: any,
  intendedRole?: 'admin' | 'pentester' | 'client'
) {
  const userId = claims["sub"];
  
  // Check if user already exists
  const existingUser = await storage.getUser(userId);
  if (existingUser) {
    // Update user information but keep existing role (security: prevent privilege escalation)
    await storage.upsertUser({
      id: userId,
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      role: existingUser.role, // Keep existing role
    });
    return;
  }
  
  // This is a new user - determine role
  const existingUsers = await storage.getUsersByRole('admin');
  const isFirstUser = existingUsers.length === 0;
  
  // Only allow role selection for first user or when no admins exist
  let role: 'admin' | 'pentester' | 'client';
  if (isFirstUser) {
    role = 'admin';
  } else if (intendedRole && ['admin', 'pentester', 'client'].includes(intendedRole)) {
    // Only allow role selection for new users in development
    role = process.env.NODE_ENV === 'development' ? intendedRole : 'client';
  } else {
    role = 'client';
  }
  
  await storage.upsertUser({
    id: userId,
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: role,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = createOIDCUser(tokens);
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
        passReqToCallback: true,
      },
      async (req: any, tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers, verified: passport.AuthenticateCallback) => {
        const user = createOIDCUser(tokens);
        // Get intended role from session if it exists
        const intendedRole = req.session?.intendedRole;
        await upsertUser(tokens.claims(), intendedRole);
        // Clear the intended role from session
        if (req.session?.intendedRole) {
          delete req.session.intendedRole;
        }
        verified(null, user);
      }
    );
    passport.use(strategy);
  }


  // Role-specific login endpoints
  app.get("/api/login", (req, res, next) => {
    // Store intended role in session if provided
    const role = req.query.role as 'admin' | 'pentester' | 'client';
    if (role && ['admin', 'pentester', 'client'].includes(role)) {
      req.session.intendedRole = role;
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Specific endpoints for each role
  app.get("/api/login/admin", (req, res, next) => {
    req.session.intendedRole = 'admin';
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/login/pentester", (req, res, next) => {
    req.session.intendedRole = 'pentester';
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/login/client", (req, res, next) => {
    req.session.intendedRole = 'client';
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
