import crypto from "crypto";

export function getAdminApiKey() {
  return process.env.ADMIN_API_KEY || "";
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || getAdminApiKey();
}

export function getSessionSecret() {
  return (
    process.env.SESSION_SECRET ||
    (getAdminApiKey() ? `${getAdminApiKey()}:college_rag_session_salt` : "default_insecure_secret_replace_in_env")
  );
}

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE_SECONDS = 86400; // 24 hours

export function signToken(payload, secret = null) {
  const effectiveSecret = secret || getSessionSecret();
  const hmac = crypto.createHmac("sha256", effectiveSecret);
  hmac.update(String(payload));
  const signature = hmac.digest("hex");
  return `${payload}.${signature}`;
}

export function verifyToken(token, secret = null) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const effectiveSecret = secret || getSessionSecret();

  try {
    const expectedSig = crypto.createHmac("sha256", effectiveSecret).update(String(payload)).digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  const timestamp = Number(payload);
  if (!Number.isNaN(timestamp)) {
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > SESSION_MAX_AGE_SECONDS || now < timestamp - 60) {
      return null; // Expired or invalid future timestamp
    }
  }

  return payload;
}

function timingSafeStringMatch(provided, expected) {
  if (!provided || !expected) return false;
  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);
  if (bufProvided.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufProvided, bufExpected);
}

export function checkAdminPassword(providedPassword) {
  if (!providedPassword || typeof providedPassword !== "string") return false;
  const configuredPassword = process.env.ADMIN_PASSWORD || "";
  const configuredApiKey = process.env.ADMIN_API_KEY || "";
  if (!configuredPassword && !configuredApiKey) return false;

  return (
    timingSafeStringMatch(providedPassword, configuredPassword) ||
    timingSafeStringMatch(providedPassword, configuredApiKey)
  );
}

export function verifyAdminRequest(request) {
  const adminKey = getAdminApiKey();

  // 1. Check API Key in header (for CLI, curl, automated test suites)
  const headerKey = request.headers.get("x-admin-key") || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearerKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const candidateKey = headerKey || bearerKey;

  if (candidateKey) {
    if (!adminKey) {
      return { authorized: false, status: 500, error: "Server configuration error: ADMIN_API_KEY is not set." };
    }
    const bufCandidate = Buffer.from(candidateKey);
    const bufExpected = Buffer.from(adminKey);
    if (bufCandidate.length === bufExpected.length && crypto.timingSafeEqual(bufCandidate, bufExpected)) {
      return { authorized: true, via: "api_key" };
    }
    return { authorized: false, status: 403, error: "Forbidden: Invalid Admin API Key." };
  }

  // 2. Check Session Cookie (for web browser admin UI)
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const [k, ...v] = c.split("=");
        return [k, decodeURIComponent(v.join("="))];
      })
  );

  const sessionToken = cookies[SESSION_COOKIE_NAME];
  if (sessionToken && verifyToken(sessionToken)) {
    // CSRF Defense for cookie-based authentication:
    // Verify Origin matches Host when Origin is present
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
      const originHost = origin.replace(/^https?:\/\//, "");
      if (originHost !== host) {
        return { authorized: false, status: 403, error: "Forbidden: CSRF verification failed (Origin mismatch)." };
      }
    }

    return { authorized: true, via: "session_cookie" };
  }

  return { authorized: false, status: 401, error: "Unauthorized: Admin authentication required." };
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
