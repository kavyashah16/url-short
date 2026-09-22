const VALID_URL_PROTOCOLS = new Set(["http:", "https:"]);

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value.trim());
    return VALID_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export { isValidHttpUrl };
