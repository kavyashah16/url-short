import { URL } from "url";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const RESERVED_ALIASES = new Set([
  "api",
  "login",
  "register",
  "short",
  "delete",
  "health",
  "stats",
  "admin",
]);

export function isValidUrl(input: string): boolean {
  try {
    const parsed = new URL(input);
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch (error) {
    return false;
  }
}

export function normalizeURL(input: string): string {
  const parsed = new URL(input);

  parsed.hostname = parsed.hostname.toLowerCase();

  if (
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443")
  ) {
    parsed.port = "";
  }

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  parsed.searchParams.sort();

  return parsed.toString();
}

export function isValidAlias(input: string): boolean {
  return ALIAS_REGEX.test(input) && !RESERVED_ALIASES.has(input.toLowerCase());
}
