import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "rolodex_session";
export const OAUTH_STATE_COOKIE = "rolodex_oauth_state";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

export type AuthConfig =
  | { enabled: false; production: boolean }
  | {
      enabled: true;
      production: boolean;
      clientId: string;
      clientSecret: string;
      secret: string;
      allowedLogin: string;
      callbackUrl: string;
    };

export type Session = { login: string; expiresAt: number };
export type OAuthState = { value: string; expiresAt: number };

const requiredVariables = [
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "AUTH_SECRET",
  "ALLOWED_GITHUB_LOGIN",
  "APP_URL",
] as const;

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createSignedValue(payload: object, secret: string) {
  const encoded = base64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, secret)}`;
}

export function readSignedValue<T>(value: string | undefined, secret: string) {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const encoded = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!constantTimeEqual(signature, sign(encoded, secret))) return null;
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    try {
      cookies[part.slice(0, separator).trim()] = decodeURIComponent(
        part.slice(separator + 1).trim(),
      );
    } catch {
      // Ignore malformed cookie values.
    }
  }
  return cookies;
}

export function sessionFromCookie(
  cookieHeader: string | undefined,
  config: AuthConfig,
  now = Date.now(),
): Session | null {
  if (!config.enabled) return { login: "local", expiresAt: Infinity };
  const signed = parseCookies(cookieHeader)[SESSION_COOKIE];
  const session = readSignedValue<Session>(signed, config.secret);
  if (
    !session ||
    typeof session.login !== "string" ||
    !Number.isSafeInteger(session.expiresAt) ||
    session.expiresAt <= now
  )
    return null;
  return session;
}

export function isAllowedLogin(login: unknown, allowedLogin: string) {
  return (
    typeof login === "string" &&
    constantTimeEqual(login.toLowerCase(), allowedLogin.toLowerCase())
  );
}

export function createOAuthState(now = Date.now()): OAuthState {
  return {
    value: randomBytes(32).toString("base64url"),
    expiresAt: now + OAUTH_STATE_MAX_AGE_SECONDS * 1000,
  };
}

export function validOAuthState(
  state: string | undefined,
  cookieHeader: string | undefined,
  config: AuthConfig,
  now = Date.now(),
) {
  if (!config.enabled || !state || state.length > 128) return false;
  const signed = parseCookies(cookieHeader)[OAUTH_STATE_COOKIE];
  const stored = readSignedValue<OAuthState>(signed, config.secret);
  return (
    !!stored &&
    typeof stored.value === "string" &&
    Number.isSafeInteger(stored.expiresAt) &&
    stored.expiresAt > now &&
    constantTimeEqual(state, stored.value)
  );
}

export function getAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const production = env.NODE_ENV === "production";
  const missing = requiredVariables.filter((name) => !env[name]?.trim());
  if (missing.length === requiredVariables.length) {
    if (production)
      throw new Error("Production requires GitHub OAuth authentication configuration.");
    return { enabled: false, production };
  }
  if (missing.length)
    throw new Error("GitHub OAuth authentication configuration is incomplete.");

  if (Buffer.byteLength(env.AUTH_SECRET!.trim()) < 32)
    throw new Error("AUTH_SECRET must contain at least 32 bytes.");
  if (!/^[A-Za-z\d](?:[A-Za-z\d-]{0,37})?$/.test(env.ALLOWED_GITHUB_LOGIN!.trim()))
    throw new Error("ALLOWED_GITHUB_LOGIN must be one GitHub login.");

  let appUrl: URL;
  try {
    appUrl = new URL(env.APP_URL!);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }
  if (production && appUrl.protocol !== "https:")
    throw new Error("Production APP_URL must use HTTPS.");
  if (
    appUrl.pathname !== "/" ||
    appUrl.search ||
    appUrl.hash ||
    appUrl.username ||
    appUrl.password
  )
    throw new Error("APP_URL must be an origin without a path, query, or fragment.");

  return {
    enabled: true,
    production,
    clientId: env.GITHUB_CLIENT_ID!.trim(),
    clientSecret: env.GITHUB_CLIENT_SECRET!.trim(),
    secret: env.AUTH_SECRET!,
    allowedLogin: env.ALLOWED_GITHUB_LOGIN!.trim(),
    callbackUrl: `${appUrl.origin}/auth/callback`,
  };
}

export function cookieOptions(maxAge: number, production: boolean) {
  return `Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${
    production ? "; Secure" : ""
  }`;
}
