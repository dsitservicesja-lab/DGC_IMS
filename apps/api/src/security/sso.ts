/**
 * SSO Configuration - OAuth2/OIDC Integration
 * Supports Azure AD, Okta, Google Identity
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authority: string; // e.g., https://login.microsoftonline.com/{tenant}
  redirectUri: string;
  scopes: string[];
  responseType: string;
}

export interface SSOProvider {
  name: string;
  config: OAuthConfig;
  type: "AZURE_AD" | "OKTA" | "GOOGLE" | "KEYCLOAK";
}

export const ssoProviders: Record<string, SSOProvider> = {
  AZURE_AD: {
    name: "Azure Active Directory",
    type: "AZURE_AD",
    config: {
      clientId: process.env.AZURE_CLIENT_ID || "",
      clientSecret: process.env.AZURE_CLIENT_SECRET || "",
      authority: process.env.AZURE_AUTHORITY || "https://login.microsoftonline.com/common",
      redirectUri: process.env.AZURE_REDIRECT_URI || "http://localhost:4000/api/auth/callback",
      scopes: ["https://graph.microsoft.com/user.read"],
      responseType: "code"
    }
  },

  OKTA: {
    name: "Okta",
    type: "OKTA",
    config: {
      clientId: process.env.OKTA_CLIENT_ID || "",
      clientSecret: process.env.OKTA_CLIENT_SECRET || "",
      authority: process.env.OKTA_DOMAIN || "https://okta-dev.okta.com",
      redirectUri: process.env.OKTA_REDIRECT_URI || "http://localhost:4000/api/auth/callback",
      scopes: ["openid", "profile", "email"],
      responseType: "code"
    }
  },

  GOOGLE: {
    name: "Google Identity",
    type: "GOOGLE",
    config: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authority: "https://accounts.google.com",
      redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/api/auth/callback",
      scopes: ["openid", "profile", "email"],
      responseType: "code"
    }
  }
};

/**
 * Initialize SSO middleware (using passport.js strategy)
 * This would be integrated with Express in authentication middleware
 */
export class SSOService {
  static getOAuthUrl(provider: string, state: string): string {
    const providerConfig = ssoProviders[provider];
    if (!providerConfig) {
      throw new Error(`Unknown SSO provider: ${provider}`);
    }

    const config = providerConfig.config;
    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: config.responseType,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(" "),
      state: state
    });

    return `${config.authority}/oauth2/v2.0/authorize?${params}`;
  }

  static async exchangeCodeForToken(
    provider: string,
    code: string,
    codeVerifier?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn: number;
  }> {
    const providerConfig = ssoProviders[provider];
    if (!providerConfig) {
      throw new Error(`Unknown SSO provider: ${provider}`);
    }

    const config = providerConfig.config;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri
    });

    if (codeVerifier) {
      body.append("code_verifier", codeVerifier);
    }

    const response = await fetch(`${config.authority}/oauth2/v2.0/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in || 3600
    };
  }

  static createAuthorizationHeader(accessToken: string): string {
    return `Bearer ${accessToken}`;
  }
}

/**
 * Example Passport.js strategy configuration
 * Install: npm install passport passport-azure-ad @types/passport
 */
export const passportAzureADConfig = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID || "",
  clientSecret: process.env.AZURE_CLIENT_SECRET || "",
  responseType: "code",
  responseMode: "form_post",
  redirectUrl: process.env.AZURE_REDIRECT_URI || "http://localhost:4000/api/auth/callback",
  allowHttpForRedirectUrl: process.env.NODE_ENV === "development",
  validateIssuer: true,
  passReqToCallback: false,
  scope: ["profile", "email"]
};

/**
 * Middleware to enforce SSO for specific routes
 * Usage: app.use('/api/protected', requireSSO)
 */
export function requireSSO(req: any, res: any, next: any) {
  if (!req.user) {
    const provider = req.query.provider || "AZURE_AD";
    const state = Buffer.from(JSON.stringify({ returnUrl: req.originalUrl })).toString("base64");
    const authUrl = SSOService.getOAuthUrl(provider, state);
    return res.redirect(authUrl);
  }
  next();
}
