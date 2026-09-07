import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return res.status(400).json({
        message: firstError?.message || "Invalid req body!",
      });
    }

    req.body = result.data;
    next();
  };
}
