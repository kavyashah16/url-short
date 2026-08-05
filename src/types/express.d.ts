import type { Tokenpayload } from "../utils/jwt.ts";

declare global {
  namespace Express {
    interface Request {
      user?: Tokenpayload;
    }
  }
}
