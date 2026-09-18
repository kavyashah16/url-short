import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {
    req.log.warn({ err }, err.message);
    return res
      .status(err.statusCode)
      .json({ message: err.message, ...err.details });
  }

  req.log.error({ err }, "Unhandled error");
  return res.status(500).json({ message: "Internal Server Error" });
}
