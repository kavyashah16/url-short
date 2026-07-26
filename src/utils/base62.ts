const CHARSET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function encodeBase62(id: number): string {
  if (id === 0) {
    return "0";
  }

  let encode = "";

  while (id > 0) {
    const remainder = id % 62;
    encode = CHARSET[remainder] + encode;
    id = Math.floor(id / 62);
  }
  return encode;
}

export function decodeBase62(shortCode: string): number {
  let res = 0;

  for (const char of shortCode) {
    const val = CHARSET.indexOf(char);

    if (val === -1) {
      throw new Error(`Invalid Base62 Character ${char}`);
    }

    res = res * 62 + val;
  }

  return res;
}
