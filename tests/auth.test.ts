import assert from "node:assert/strict";
import test from "node:test";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  constantTimeEqual,
  cookieOptions,
  createSignedValue,
  getAuthConfig,
  isAllowedLogin,
  sessionFromCookie,
  validOAuthState,
} from "../server/auth.js";

const config = {
  enabled: true as const,
  production: true,
  clientId: "client-id",
  clientSecret: "client-secret",
  secret: "test-session-signing-secret",
  allowedLogin: "shaunaleebrennan",
  callbackUrl: "https://rolodex.example.com/auth/callback",
};

test("signed sessions reject altered values and expired sessions", () => {
  const valid = createSignedValue(
    { login: "shaunaleebrennan", expiresAt: 10_000 },
    config.secret,
  );
  assert.deepEqual(
    sessionFromCookie(`${SESSION_COOKIE}=${valid}`, config, 9_999),
    { login: "shaunaleebrennan", expiresAt: 10_000 },
  );
  assert.equal(
    sessionFromCookie(`${SESSION_COOKIE}=${valid}x`, config, 9_999),
    null,
  );
  assert.equal(sessionFromCookie(`${SESSION_COOKIE}=${valid}`, config, 10_000), null);
});

test("OAuth state must be signed, unexpired, and match in constant time", () => {
  const state = { value: "state-value", expiresAt: 10_000 };
  const signed = createSignedValue(state, config.secret);
  const cookie = `${OAUTH_STATE_COOKIE}=${signed}`;
  assert.equal(validOAuthState("state-value", cookie, config, 9_999), true);
  assert.equal(validOAuthState("wrong-value", cookie, config, 9_999), false);
  assert.equal(validOAuthState("state-value", cookie, config, 10_000), false);
  assert.equal(constantTimeEqual("same", "same"), true);
  assert.equal(constantTimeEqual("same", "different"), false);
});

test("access is limited to the configured GitHub login", () => {
  assert.equal(isAllowedLogin("ShaunaLeeBrennan", config.allowedLogin), true);
  assert.equal(isAllowedLogin("another-user", config.allowedLogin), false);
  assert.equal(isAllowedLogin(undefined, config.allowedLogin), false);
});

test("production requires complete HTTPS OAuth configuration", () => {
  assert.throws(
    () => getAuthConfig({ NODE_ENV: "production" }),
    /requires GitHub OAuth authentication/,
  );
  assert.deepEqual(getAuthConfig({ NODE_ENV: "development" }), {
    enabled: false,
    production: false,
  });
  assert.throws(
    () =>
      getAuthConfig({
        NODE_ENV: "production",
        GITHUB_CLIENT_ID: "id",
        GITHUB_CLIENT_SECRET: "secret",
        AUTH_SECRET: "a-secure-test-auth-secret-that-is-long-enough",
        ALLOWED_GITHUB_LOGIN: "shaunaleebrennan",
        APP_URL: "http://rolodex.example.com",
      }),
    /must use HTTPS/,
  );
  assert.match(cookieOptions(60, true), /HttpOnly; SameSite=Lax; Secure$/);
});
