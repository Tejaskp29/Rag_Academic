/**
 * Centralized server-side Flask backend URL configuration.
 * Reads from process.env.FLASK_BACKEND_URL with fallback to http://127.0.0.1:5000.
 * This is server-side only; never expose through NEXT_PUBLIC_ variables.
 */

export function getFlaskBackendUrl() {
  const url = process.env.FLASK_BACKEND_URL || "http://127.0.0.1:5000";
  return url.replace(/\/+$/, "");
}

export const FLASK_BACKEND_URL =
  process.env.FLASK_BACKEND_URL || "http://127.0.0.1:5000";

export function getAdminApiKey() {
  return process.env.ADMIN_API_KEY || "";
}

export function getAdminBackendHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  const adminKey = getAdminApiKey();
  if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }
  return headers;
}

export default getFlaskBackendUrl;
