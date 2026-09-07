import z from "zod";
import { isValidUrl } from "../utils/urlUtils.js";

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

export const shortUrlSchema = z.object({
  url: z.string().refine(isValidUrl, "Please provide a valid http/https URL."),
  customAlias: z
    .string()
    .regex(
      ALIAS_REGEX,
      "Custom alias must be 3-30 characters (letters, numbers, - or _).",
    )
    .refine(
      (val) => !RESERVED_ALIASES.has(val.toLowerCase()),
      "This alias is reserved.",
    )
    .optional(),
  expiresAt: z.iso.datetime().optional(),
  password: z.string().max(100).optional(),
  clickLimit: z.coerce.number().int().positive().optional(),
});
