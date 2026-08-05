import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";

export function validateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access token is mssing!",
    });
  }

  const token = authHeader.split(" ")[1]!;

  try {
    const playLoad = verifyToken(token);
    req.user = playLoad;
    next();
  } catch (error) {
    if (error instanceof Error && error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired." });
    }

    return res.status(403).json({ message: "Invalid token." });
  }
}
